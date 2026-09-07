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
    #[Route('/game', name: 'game')]
    public function index(BlindTestRepository $blindTestRepository): Response
    {
        $blindTests = array_filter(
            $blindTestRepository->findAll(),
            static fn (BlindTest $blindTest): bool => !$blindTest->getQuestions()->isEmpty()
        );

        return $this->render('game/index.html.twig', [
            'blindTests' => $blindTests,
        ]);
    }

    #[Route('/game/{gameId}/host', name: 'game_host')]
    public function host(string $gameId): Response
    {
        return $this->render('game/host.html.twig', [
            'gameId' => $gameId,
        ]);
    }

    #[Route('/game/{gameId}/join', name: 'game_join')]
    public function join(string $gameId): Response
    {
        return $this->render('game/join.html.twig', [
            'gameId' => $gameId,
        ]);
    }

    /**
     * Toute la partie se déroule sur cette seule page : les morceaux sont
     * embarqués en JSON et enchaînés en JS, sans rechargement de page, pour
     * que le son puisse continuer à se lancer automatiquement après le
     * premier clic (les navigateurs bloquent l'autoplay avec son après un
     * changement de page).
     */
    #[Route('/game/{gameId}/play', name: 'game_play', methods: ['GET'])]
    public function play(#[MapEntity(id: 'gameId')] BlindTest $blindTest, Request $request): Response
    {
        if ($blindTest->getQuestions()->isEmpty()) {
            return $this->redirectToRoute('home');
        }

        $tracks = [];
        foreach ($blindTest->getQuestions() as $question) {
            $tracks[] = [
                'source' => $question->getSource(),
                'youtubeId' => $question->getYoutubeId(),
                'mp3Src' => $question->getMp3Path() ? '/' . $question->getMp3Path() : null,
                'startTime' => $question->getStartTime(),
                'duration' => $blindTest->getDuration(),
                'artist' => $question->getArtist(),
                'title' => $question->getTitle(),
                'year' => $question->getYear(),
            ];
        }

        return $this->render('game/play.html.twig', [
            'blindTest' => $blindTest,
            'tracks' => $tracks,
            'total' => count($tracks),
            'isPreview' => '1' === $request->query->get('preview'),
        ]);
    }

    #[Route('/game/{gameId}/result', name: 'game_result', methods: ['GET'])]
    public function result(#[MapEntity(id: 'gameId')] BlindTest $blindTest): Response
    {
        return $this->render('game/result.html.twig', [
            'blindTest' => $blindTest,
        ]);
    }
}
