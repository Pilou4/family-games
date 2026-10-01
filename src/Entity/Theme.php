<?php

namespace App\Entity;

use App\Repository\ThemeRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Un thème = un habillage visuel complet du jeu (couleurs, animations,
 * sons éventuels), du début à la fin (accueil, règles, c'est parti,
 * extrait, révélation, écran final).
 *
 * Le "slug" sert à retrouver les fichiers du thème : un thème dont le slug
 * est "halloween" est habillé par assets/styles/themes/halloween.css
 * (et un .js optionnel au même endroit). Voir docs/THEMES.md pour la
 * convention complète.
 */
#[ORM\Entity(repositoryClass: ThemeRepository::class)]
#[UniqueEntity(fields: ['slug'], message: 'Ce slug est déjà utilisé par un autre thème.')]
class Theme
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[Assert\NotBlank(message: 'Le nom est obligatoire.')]
    #[ORM\Column(length: 100)]
    private ?string $name = null;

    /**
     * Identifiant technique du thème (minuscules, tirets), utilisé pour
     * retrouver ses fichiers CSS/JS et pour la classe posée sur <body>
     * (`theme-{slug}`). Exemple : "halloween", "noel", "anniversaire".
     */
    #[Assert\NotBlank(message: 'Le slug est obligatoire.')]
    #[Assert\Regex(pattern: '/^[a-z0-9]+(-[a-z0-9]+)*$/', message: 'Le slug ne doit contenir que des minuscules, chiffres et tirets.')]
    #[ORM\Column(length: 100, unique: true)]
    private ?string $slug = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $created_at = null;

    public function __construct()
    {
        $this->created_at = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(?string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getSlug(): ?string
    {
        return $this->slug;
    }

    public function setSlug(?string $slug): static
    {
        $this->slug = $slug;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->created_at;
    }

    public function __toString(): string
    {
        return $this->name ?? '';
    }
}
