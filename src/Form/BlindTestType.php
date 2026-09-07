<?php

namespace App\Form;

use App\Entity\BlindTest;
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
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => BlindTest::class,
        ]);
    }
}
