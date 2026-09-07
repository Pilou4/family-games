<?php

namespace App\Twig;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

class SvgExtension extends AbstractExtension
{
    public function __construct(
        #[Autowire('%kernel.project_dir%')]
        private readonly string $projectDir,
    ) {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('inline_svg', $this->inlineSvg(...), ['is_safe' => ['html']]),
        ];
    }

    /**
     * Injecte le contenu brut d'un fichier SVG de public/, pour pouvoir le
     * colorer en CSS (currentColor) tout en gardant le fichier réutilisable
     * ailleurs (balise <img>, autre projet...).
     */
    public function inlineSvg(string $path): string
    {
        $fullPath = $this->projectDir . '/public/' . ltrim($path, '/');

        if (!is_file($fullPath)) {
            return '';
        }

        return file_get_contents($fullPath);
    }
}
