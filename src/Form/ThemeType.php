<?php

namespace App\Form;

use App\Entity\Theme;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class ThemeType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label' => 'Nom du thème',
                'attr' => ['placeholder' => 'ex: Anniversaire'],
            ])
            ->add('slug', TextType::class, [
                'label' => 'Slug (identifiant technique)',
                'attr' => ['placeholder' => 'ex: anniversaire'],
                'help' => 'Minuscules, chiffres et tirets uniquement. Doit correspondre au nom des fichiers du thème (voir docs/THEMES.md).',
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Theme::class,
        ]);
    }
}
