<?php

namespace App\Entity;

use App\Repository\BlindTestRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: BlindTestRepository::class)]
#[UniqueEntity(fields: ['name'], message: 'Un blind test porte déjà ce nom.')]
class BlindTest
{
    /**
     * Liste des critères qu'on peut demander de deviner. Pour en ajouter un
     * plus tard, il suffit d'ajouter une ligne ici — le formulaire et la
     * validation s'adaptent automatiquement.
     */
    public const AVAILABLE_REQUIRED_FIELDS = [
        'title' => 'Titre',
        'artist' => 'Artiste',
        'year' => 'Année',
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[Assert\NotBlank(message: 'Le nom est obligatoire.')]
    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[Assert\Count(min: 1, minMessage: 'Coche au moins un critère à deviner.')]
    #[ORM\Column(type: Types::JSON)]
    private array $requiredFields = [];

    #[Assert\Range(min: 5, max: 30, notInRangeMessage: 'La durée doit être comprise entre {{ min }} et {{ max }} secondes.')]
    #[ORM\Column]
    private int $duration = 10;

    #[ORM\Column]
    private ?\DateTimeImmutable $created_at = null;

    /**
     * NULL = thème "Défaut" (le rendu actuel, sans habillage particulier).
     */
    #[ORM\ManyToOne(targetEntity: Theme::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Theme $theme = null;

    /**
     * @var Collection<int, Questions>
     */
    #[ORM\OneToMany(targetEntity: Questions::class, mappedBy: 'blind_test_id', cascade: ['remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['sort_order' => 'ASC'])]
    private Collection $questions;

    public function __construct()
    {
        $this->questions = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    /**
     * @return string[]
     */
    public function getRequiredFields(): array
    {
        return $this->requiredFields;
    }

    /**
     * @param string[] $requiredFields
     */
    public function setRequiredFields(array $requiredFields): static
    {
        $this->requiredFields = $requiredFields;

        return $this;
    }

    public function getDuration(): int
    {
        return $this->duration;
    }

    public function setDuration(int $duration): static
    {
        $this->duration = $duration;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->created_at;
    }

    public function setCreatedAt(\DateTimeImmutable $created_at): static
    {
        $this->created_at = $created_at;

        return $this;
    }

    /**
     * @return Collection<int, Questions>
     */
    public function getQuestions(): Collection
    {
        return $this->questions;
    }

    public function addQuestion(Questions $question): static
    {
        if (!$this->questions->contains($question)) {
            $this->questions->add($question);
            $question->setBlindTestId($this);
        }

        return $this;
    }

    public function removeQuestion(Questions $question): static
    {
        if ($this->questions->removeElement($question)) {
            // set the owning side to null (unless already changed)
            if ($question->getBlindTestId() === $this) {
                $question->setBlindTestId(null);
            }
        }

        return $this;
    }

    public function getNextQuestionOrder(): int
    {
        $max = 0;
        foreach ($this->questions as $question) {
            $max = max($max, $question->getSortOrder());
        }

        return $max + 1;
    }

    public function getTheme(): ?Theme
    {
        return $this->theme;
    }

    public function setTheme(?Theme $theme): static
    {
        $this->theme = $theme;

        return $this;
    }
}
