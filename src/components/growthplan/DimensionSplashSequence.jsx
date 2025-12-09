import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DIMENSIONS } from '../../utils/dimensionData';
import Logo from '../shared/Logo';
import Button from '../shared/Button';
import './DimensionSplashSequence.css';

export default function DimensionSplashSequence({ dimension, onComplete }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const data = DIMENSIONS[dimension];

  if (!data) return null;

  const handleNext = () => {
    if (currentSlide < 2) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const slides = [
    // Slide 1: Definition - solid color background
    {
      background: data.color,
      className: 'splash-sequence--slide1',
      content: (
        <>
          <p className="splash-sequence__small-text">The dimension of</p>
          <h1 className="splash-sequence__dimension-name">{data.name}</h1>
          <Logo
            type="dimension"
            dimension={dimension}
            variant="inverse"
            className="splash-sequence__logo-inverse"
          />
          <p className="splash-sequence__description">
            is a measure of {data.definition}
          </p>
        </>
      ),
      buttonStyle: 'light',
    },
    // Slide 2: Essential - gradient background
    {
      background: `linear-gradient(180deg, var(--light-neutral) 0%, ${data.color} 100%)`,
      className: 'splash-sequence--slide2',
      content: (
        <>
          <Logo
            type="dimension"
            dimension={dimension}
            variant="color-trans"
            className="splash-sequence__top-logo"
          />
          <p className="splash-sequence__essential-text" style={{ color: data.color }}>
            This dimension is essential to complete flourishing because {data.essential.toLowerCase()}
          </p>
        </>
      ),
      buttonStyle: 'color',
    },
    // Slide 3: Growth Focus - solid color background
    {
      background: data.color,
      className: 'splash-sequence--slide3',
      content: (
        <>
          <Logo
            type="dimension"
            dimension={dimension}
            variant="light-trans"
            className="splash-sequence__top-logo"
          />
          <p className="splash-sequence__growth-text">
            A plan to grow in this area will focus on {data.growthFocus.charAt(0).toLowerCase() + data.growthFocus.slice(1)}
          </p>
        </>
      ),
      buttonStyle: 'light',
    },
  ];

  const currentSlideData = slides[currentSlide];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentSlide}
        className={`splash-sequence ${currentSlideData.className}`}
        style={{ background: currentSlideData.background }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="splash-sequence__content">
          {currentSlideData.content}
        </div>

        <div className="splash-sequence__footer">
          <Button
            variant={currentSlideData.buttonStyle === 'light' ? 'primary-on-color' : 'primary'}
            dimensionColor={currentSlideData.buttonStyle === 'color' ? data.color : undefined}
            onClick={handleNext}
            fullWidth
          >
            Next
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
