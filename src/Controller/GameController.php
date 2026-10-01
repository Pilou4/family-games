<?php

namespace App\Controller;

use App\Entity\BlindTest;
use App\Repository\BlindTestRepository;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class GameController extends AbstractController
{
    /**
     * Thèmes réellement développés — tout blind test dont le thème n'est
     * pas dans cette liste (ou n'a pas de thème) retombe sur "default".
     * Le fichier templates/game/themes/{slug}.html.twig doit exister pour
     * chaque entrée ici.
     */
    private const AVAILABLE_THEME_SLUGS = [
        'default',
        'anniversaire',
    ];

    #[Route('/game', name: 'game')]
    public function index(BlindTestRepository $blindTestRepository): Response
    {
        $blindTests = array_filter(
            $blindTestRepository->findAll(),
            static fn(BlindTest $blindTest): bool => !$blindTest->getQuestions()->isEmpty()
        );

        return $this->render('game/index.html.twig', [
            'blindTests' => $blindTests,
        ]);
    }

    #[Route('/game/{gameId}/play', name: 'game_play', methods: ['GET'])]
    public function play(
        #[MapEntity(id: 'gameId')] BlindTest $blindTest,
        Request $request,
    ): Response {
        if ($blindTest->getQuestions()->isEmpty()) {
            return $this->redirectToRoute('game');
        }

        $themeSlug = $blindTest->getTheme()?->getSlug();
        if (null === $themeSlug || !in_array($themeSlug, self::AVAILABLE_THEME_SLUGS, true)) {
            $themeSlug = 'default';
        }

        $tracks = [];
        foreach ($blindTest->getQuestions() as $question) {
            $tracks[] = [
                'source' => $question->getSource(),
                'mp3Src' => $question->getMp3Path() ? '/' . $question->getMp3Path() : null,
                'youtubeId' => $question->getYoutubeId(),
                'startTime' => $question->getStartTime(),
                'duration' => $blindTest->getDuration(),
                'artist' => $question->getArtist(),
                'title' => $question->getTitle(),
                'year' => $question->getYear(),
            ];
        }

        return $this->render('game/play.html.twig', [
            'blindTest' => $blindTest,
            'themeSlug' => $themeSlug,
            'isPreview' => '1' === $request->query->get('preview'),
            'tracksJson' => json_encode($tracks, JSON_THROW_ON_ERROR),
            'requiredFieldsJson' => json_encode($blindTest->getRequiredFields(), JSON_THROW_ON_ERROR),
        ]);
    }
}
