import React from 'react';
import { SlideRenderer } from './SlideRenderer';
import { initialSlides } from './reportData';

export interface SlideProps {
  slide: any;
  updateSlide: (updated: any) => void;
  isEditMode: boolean;
}

const GenericSlide: React.FC<SlideProps> = ({ slide, updateSlide, isEditMode }) => {
  return (
    <SlideRenderer
      slide={slide}
      onUpdateSlide={updateSlide}
      isEditMode={isEditMode}
    />
  );
};

export const SLIDES = initialSlides.map((s, idx) => ({
  id: idx + 1,
  title: s.title,
  type: s.type,
  component: GenericSlide,
  // Mapping categories based on slide type or keeping them broad for now
  categories: ['SEO', 'Performance Marketing', 'Social Media Marketing', 'Combined Intelligence']
}));

export { SlideRenderer };
