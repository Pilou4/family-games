<?php

namespace App\Controller\Api;

use App\Entity\BlindTest;
use App\Repository\BlindTestRepository;
use App\Service\BlindTestDeleter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/game', name: 'api_game_')]
final class ApiGameController extends AbstractController
{
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(BlindTestRepository $blindTestRepository): JsonResponse
    {
        $blindTests = array_map(
            fn (BlindTest $blindTest): array => $this->serialize($blindTest),
            $blindTestRepository->findAll()
        );

        return $this->json($blindTests);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'])]
    public function show(BlindTest $blindTest): JsonResponse
    {
        return $this->json($this->serialize($blindTest));
    }

    #[Route('/{id}', name: 'update', methods: ['PATCH'])]
    public function update(BlindTest $blindTest, Request $request, EntityManagerInterface $entityManager, ValidatorInterface $validator): JsonResponse
    {
        if (!$this->isCsrfTokenValid('edit-blind-test-' . $blindTest->getId(), $request->headers->get('X-CSRF-Token'))) {
            return $this->json(['error' => 'Jeton de sécurité invalide.'], 403);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (array_key_exists('name', $data)) {
            $blindTest->setName(trim((string) $data['name']));
        }

        if (array_key_exists('description', $data)) {
            $blindTest->setDescription($data['description']);
        }

        if (array_key_exists('duration', $data)) {
            $blindTest->setDuration((int) $data['duration']);
        }

        $violations = $validator->validate($blindTest);
        if (count($violations) > 0) {
            return $this->json(['error' => $violations[0]->getMessage()], 422);
        }

        $entityManager->flush();

        return $this->json($this->serialize($blindTest));
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(BlindTest $blindTest, Request $request, BlindTestDeleter $blindTestDeleter): JsonResponse
    {
        if (!$this->isCsrfTokenValid('delete-blind-test-' . $blindTest->getId(), $request->headers->get('X-CSRF-Token'))) {
            return $this->json(['error' => 'Jeton de sécurité invalide.'], 403);
        }

        $blindTestDeleter->delete($blindTest);

        return $this->json(['success' => true]);
    }

    private function serialize(BlindTest $blindTest): array
    {
        return [
            'id' => $blindTest->getId(),
            'name' => $blindTest->getName(),
            'description' => $blindTest->getDescription(),
            'requiredFields' => $blindTest->getRequiredFields(),
            'duration' => $blindTest->getDuration(),
            'questionsCount' => $blindTest->getQuestions()->count(),
            'createdAt' => $blindTest->getCreatedAt()?->format('d/m/Y'),
        ];
    }
}
