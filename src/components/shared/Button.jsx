import { motion } from 'framer-motion';
import './Button.css';

export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  dimensionColor = null,
  disabled = false,
  fullWidth = false,
  type = 'button',
  className = ''
}) {
  const buttonClasses = [
    'button',
    `button--${variant}`,
    fullWidth ? 'button--full-width' : '',
    disabled ? 'button--disabled' : '',
    className
  ].filter(Boolean).join(' ');

  const style = {};
  
  if (dimensionColor) {
    if (variant === 'primary') {
      style.backgroundColor = dimensionColor;
      style.color = 'var(--light-neutral)';
    } else if (variant === 'primary-on-color') {
      style.backgroundColor = 'var(--light-neutral)';
      style.color = dimensionColor;
    } else if (variant === 'outlined') {
      style.borderColor = dimensionColor;
      style.color = dimensionColor;
    } else if (variant === 'outlined-on-color') {
      style.borderColor = 'var(--light-neutral)';
      style.color = 'var(--light-neutral)';
    }
  }

  return (
    <motion.button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      style={style}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ duration: 0.1 }}
    >
      {children}
    </motion.button>
  );
}
