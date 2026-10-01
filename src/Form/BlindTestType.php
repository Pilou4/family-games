<?php

namespace App\Form;

use App\Entity\BlindTest;
use App\Entity\Theme;
use App\Repository\ThemeRepository;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class BlindTestType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Nom du blind test',
            ])
            ->add('description', TextareaType::class, [
                'label' => 'Description',
                'required' => false,
            ])
            ->add('requiredFields', ChoiceType::class, [
                'label' => 'Ce qu\'il faut deviner',
                'choices' => array_flip(BlindTest::AVAILABLE_REQUIRED_FIELDS),
                'multiple' => true,
                'expanded' => true,
                'required' => false,
            ])
            ->add('duration', IntegerType::class, [
                'label' => 'Durée des extraits (secondes)',
                'help' => 'Valeur commune à tous les morceaux de ce blind test.',
            ])
            ->add('theme', EntityType::class, [
                'label' => 'Thème visuel',
                'class' => Theme::class,
                // Majuscule au début uniquement pour l'affichage dans ce
                // select — le nom du thème n'est pas modifié en base.
                'choice_label' => fn (Theme $theme) => ucfirst($theme->getName()),
                // Avant, "Défaut" n'existait pas en base : ce menu ajoutait
                // lui-même une option "Défaut" (via "placeholder") pour
                // représenter "pas de thème choisi". Maintenant que
                // "Default" est un thème comme les autres, créé en admin
                // (/admin/theme), ce menu ne doit lister QUE les vrais
                // thèmes en base, sinon "Défaut" apparaît deux fois.
                'required' => false,
                'placeholder' => false,
                // Le thème "Default" doit apparaître en premier dans la
                // liste (et donc être sélectionné par défaut à la création
                // d'un blind test, puisqu'il n'y a pas de "placeholder").
                // On trie ici par slug plutôt que de dépendre de l'id en
                // base : ça reste correct même si l'id de "Default" change
                // plus tard (ex: passage de l'id 2 à l'id 1).
                'query_builder' => fn (ThemeRepository $themeRepository) => $themeRepository
                    ->createQueryBuilder('t')
                    ->orderBy("CASE WHEN t.slug = 'default' THEN 0 ELSE 1 END", 'ASC')
                    ->addOrderBy('t.name', 'ASC'),
                'help' => 'Habillage visuel complet du jeu.',
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => BlindTest::class,
        ]);
    }
}
