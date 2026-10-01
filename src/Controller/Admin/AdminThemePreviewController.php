<?php

namespace App\Controller\Admin;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Prévisualise un thème complet, écran par écran, sans passer par un vrai
 * blind test. Le fichier templates/game/themes/{slug}.html.twig contient
 * TOUT le thème (tous les écrans), c'est le même fichier qui sera ensuite
 * branché sur le vrai jeu.
 */
#[Route('/admin/theme', name: 'admin_theme_')]
final class AdminThemePreviewController extends AbstractController
{
    #[Route('/{slug}/preview', name: 'preview')]
    public function preview(string $slug): Response
    {
        $templatePath = "game/themes/{$slug}.html.twig";
        $projectDir = $this->getParameter('kernel.project_dir');
        $exists = file_exists($projectDir . '/templates/' . $templatePath);

        return $this->render('admin/theme_preview/show.html.twig', [
            'slug' => $slug,
            'template' => $templatePath,
            'exists' => $exists,
        ]);
    }
}
