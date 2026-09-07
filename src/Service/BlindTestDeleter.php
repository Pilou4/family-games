<?php

namespace App\Service;

use App\Entity\BlindTest;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class BlindTestDeleter
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        #[Autowire('%kernel.project_dir%')]
        private readonly string $projectDir,
    ) {
    }

    /**
     * Supprime le blind test, ses questions (cascade en base) et les
     * fichiers MP3 associés sur le disque (jamais nettoyés automatiquement
     * par la base de données).
     */
    public function delete(BlindTest $blindTest): void
    {
        foreach ($blindTest->getQuestions() as $question) {
            $this->deleteMp3File($question->getMp3Path());
        }

        $this->entityManager->remove($blindTest);
        $this->entityManager->flush();
    }

    private function deleteMp3File(?string $mp3Path): void
    {
        if (!$mp3Path) {
            return;
        }

        $fullPath = $this->projectDir . '/public/' . $mp3Path;

        if (is_file($fullPath)) {
            @unlink($fullPath);
        }
    }
}
