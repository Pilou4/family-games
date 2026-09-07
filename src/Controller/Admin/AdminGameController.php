<?php

namespace App\Controller\Admin;

use App\Entity\BlindTest;
use App\Entity\Questions;
use App\Form\BlindTestType;
use App\Repository\BlindTestRepository;
use App\Service\BlindTestDeleter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\FormInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\String\Slugger\SluggerInterface;

#[Route('/admin/game', name: 'admin_game_')]
final class AdminGameController extends AbstractController
{
    #[Route('', name: 'index', methods: ['GET'])]
    public function index(BlindTestRepository $blindTestRepository): Response
    {
        return $this->render('admin/game/index.html.twig', [
            'blindTests' => $blindTestRepository->findAll(),
        ]);
    }

    #[Route('/new', name: 'new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $entityManager, SluggerInterface $slugger): Response
    {
        $blindTest = new BlindTest();
        $blindTest->setCreatedAt(new \DateTimeImmutable());

        $form = $this->createForm(BlindTestType::class, $blindTest);
        $form->handleRequest($request);

        return $this->handleFormSubmission($form, $blindTest, $request, $entityManager, $slugger, 'admin/game/new.html.twig', 'a été créé');
    }

    #[Route('/{id}/edit', name: 'edit', methods: ['GET', 'POST'])]
    public function edit(Request $request, BlindTest $blindTest, EntityManagerInterface $entityManager, SluggerInterface $slugger): Response
    {
        $form = $this->createForm(BlindTestType::class, $blindTest);
        $form->handleRequest($request);

        return $this->handleFormSubmission($form, $blindTest, $request, $entityManager, $slugger, 'admin/game/edit.html.twig', 'a été mis à jour');
    }

    #[Route('/{id}/delete', name: 'delete', methods: ['POST'])]
    public function delete(Request $request, BlindTest $blindTest, BlindTestDeleter $blindTestDeleter): Response
    {
        if ($this->isCsrfTokenValid('delete-blind-test-' . $blindTest->getId(), $request->request->get('_token'))) {
            $blindTestDeleter->delete($blindTest);
        }

        return $this->redirectToRoute('admin_game_index');
    }

    /**
     * Logique commune à new() et edit() : si le client attend du JSON
     * (envoyé par le formulaire en JS), on répond en JSON sans jamais
     * recharger la page — les morceaux ajoutés dynamiquement restent donc
     * remplis même en cas d'erreur de validation.
     */
    private function handleFormSubmission(
        FormInterface $form,
        BlindTest $blindTest,
        Request $request,
        EntityManagerInterface $entityManager,
        SluggerInterface $slugger,
        string $template,
        string $successVerb,
    ): Response {
        $wantsJson = 'application/json' === $request->headers->get('Accept');

        if ($form->isSubmitted() && $form->isValid()) {
            $isNew = null === $blindTest->getId();
            if ($isNew) {
                $entityManager->persist($blindTest);
            }

            $this->saveQuestionsFromRequest($request, $blindTest, $entityManager, $slugger);
            $entityManager->flush();

            $this->addFlash('success', 'Le blind test "' . $blindTest->getName() . '" ' . $successVerb . '.');

            if ($wantsJson) {
                return $this->json([
                    'success' => true,
                    'redirectUrl' => $this->generateUrl('admin_game_index'),
                ]);
            }

            return $this->redirectToRoute('admin_game_index');
        }

        if ($form->isSubmitted() && $wantsJson) {
            return $this->json([
                'success' => false,
                'errors' => $this->extractFormErrors($form),
            ], 422);
        }

        return $this->render($template, [
            'blindTest' => $blindTest,
            'form' => $form,
        ]);
    }

    /**
     * @return array<string, string>
     */
    private function extractFormErrors(FormInterface $form): array
    {
        $errors = [];

        foreach ($form as $child) {
            if (count($child->getErrors()) > 0) {
                $errors[$child->getName()] = (string) $child->getErrors()[0]->getMessage();
            }
        }

        return $errors;
    }

    /**
     * Lit les morceaux gérés dynamiquement en JS (champs questions[N][...]).
     * Met à jour ceux qui ont déjà un id (édition), en crée de nouveaux
     * sinon, et supprime les morceaux existants qui ne sont plus soumis
     * (retirés côté JS via le bouton "✕"). Les fieldsets sans identité
     * (titre/artiste/année) ni source (YouTube/MP3) sont ignorés ici aussi,
     * par sécurité, même si le JS est censé déjà les avoir filtrés.
     */
    private function saveQuestionsFromRequest(Request $request, BlindTest $blindTest, EntityManagerInterface $entityManager, SluggerInterface $slugger): void
    {
        $questionsData = $request->request->all('questions');
        $questionsFiles = $request->files->all('questions');
        $keptExistingIds = [];

        foreach ($questionsData as $index => $data) {
            $artist = trim((string) ($data['artist'] ?? ''));
            $title = trim((string) ($data['title'] ?? ''));
            $year = '' !== ($data['year'] ?? '') ? (int) $data['year'] : null;
            $source = $data['source'] ?? 'mp3';
            $youtubeId = trim((string) ($data['youtubeId'] ?? ''));
            $existingId = !empty($data['id']) ? (int) $data['id'] : null;
            /** @var UploadedFile|null $mp3File */
            $mp3File = $questionsFiles[$index]['mp3File'] ?? null;

            $existingQuestion = $existingId ? $this->findQuestionById($blindTest, $existingId) : null;

            $hasIdentity = '' !== $artist || '' !== $title || null !== $year;
            $hasSource = ('youtube' === $source && '' !== $youtubeId)
                || ('mp3' === $source && (null !== $mp3File || (null !== $existingQuestion && $existingQuestion->getMp3Path())));

            if (!$hasIdentity || !$hasSource) {
                continue;
            }

            $question = $existingQuestion ?? new Questions();
            $isNewQuestion = null === $existingQuestion;

            if ($isNewQuestion) {
                $question->setType('musique');
                $question->setSortOrder($blindTest->getNextQuestionOrder());
            } else {
                $keptExistingIds[] = $existingQuestion->getId();
            }

            $question->setArtist($artist);
            $question->setTitle($title);
            $question->setYear($year);
            $question->setSource($source);
            $question->setStartTime((int) ($data['startTime'] ?? 0));

            if ('youtube' === $source) {
                $question->setYoutubeId($youtubeId);
                $question->setMp3Path(null);
            } elseif (null !== $mp3File) {
                $question->setMp3Path($this->storeMp3File($mp3File, $slugger));
                $question->setYoutubeId(null);
            }
            // Sinon (mp3 sans nouveau fichier, morceau existant) : on garde l'ancien mp3Path tel quel.

            if ($isNewQuestion) {
                $blindTest->addQuestion($question);
                $entityManager->persist($question);
            }
        }

        // Les morceaux existants non soumis ont été retirés côté JS : on les supprime.
        foreach ($blindTest->getQuestions()->toArray() as $existingQuestion) {
            if (null !== $existingQuestion->getId() && !in_array($existingQuestion->getId(), $keptExistingIds, true)) {
                $blindTest->removeQuestion($existingQuestion);
                $entityManager->remove($existingQuestion);
            }
        }
    }

    private function findQuestionById(BlindTest $blindTest, int $id): ?Questions
    {
        foreach ($blindTest->getQuestions() as $question) {
            if ($question->getId() === $id) {
                return $question;
            }
        }

        return null;
    }

    private function storeMp3File(UploadedFile $mp3File, SluggerInterface $slugger): string
    {
        $originalFilename = pathinfo($mp3File->getClientOriginalName(), PATHINFO_FILENAME);
        $safeFilename = $slugger->slug($originalFilename);
        $newFilename = $safeFilename . '-' . uniqid() . '.' . $mp3File->guessExtension();

        $mp3File->move(
            $this->getParameter('kernel.project_dir') . '/public/music',
            $newFilename
        );

        return 'music/' . $newFilename;
    }
}
