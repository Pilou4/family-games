<?php

namespace App\Entity;

use App\Repository\QuestionsRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: QuestionsRepository::class)]
class Questions
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 50)]
    private ?string $type = null;

    #[ORM\Column]
    private ?int $sort_order = null;

    #[ORM\ManyToOne(inversedBy: 'questions')]
    private ?BlindTest $blind_test_id = null;

    #[ORM\Column(length: 150)]
    private ?string $artist = null;

    #[ORM\Column(length: 150)]
    private ?string $title = null;

    #[ORM\Column(nullable: true)]
    private ?int $year = null;

    #[ORM\Column(length: 20)]
    private ?string $source = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $youtube_id = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $mp3_path = null;

    #[ORM\Column]
    private int $start_time = 0;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(string $type): static
    {
        $this->type = $type;

        return $this;
    }

    public function getSortOrder(): ?int
    {
        return $this->sort_order;
    }

    public function setSortOrder(int $sort_order): static
    {
        $this->sort_order = $sort_order;

        return $this;
    }

    public function getBlindTestId(): ?BlindTest
    {
        return $this->blind_test_id;
    }

    public function setBlindTestId(?BlindTest $blind_test_id): static
    {
        $this->blind_test_id = $blind_test_id;

        return $this;
    }

    public function getArtist(): ?string
    {
        return $this->artist;
    }

    public function setArtist(string $artist): static
    {
        $this->artist = $artist;

        return $this;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getYear(): ?int
    {
        return $this->year;
    }

    public function setYear(?int $year): static
    {
        $this->year = $year;

        return $this;
    }

    public function getSource(): ?string
    {
        return $this->source;
    }

    public function setSource(string $source): static
    {
        $this->source = $source;

        return $this;
    }

    public function getYoutubeId(): ?string
    {
        return $this->youtube_id;
    }

    public function setYoutubeId(?string $youtube_id): static
    {
        $this->youtube_id = $youtube_id;

        return $this;
    }

    public function getMp3Path(): ?string
    {
        return $this->mp3_path;
    }

    public function setMp3Path(?string $mp3_path): static
    {
        $this->mp3_path = $mp3_path;

        return $this;
    }

    public function getStartTime(): int
    {
        return $this->start_time;
    }

    public function setStartTime(int $start_time): static
    {
        $this->start_time = $start_time;

        return $this;
    }
}
