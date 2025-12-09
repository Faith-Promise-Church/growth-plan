import './Logo.css';

export default function Logo({ 
  type = 'dimension', // 'dimension' | 'app'
  dimension = null,
  variant = 'standard', // 'standard' | 'inverse' | 'light-trans' | 'color-trans' | 'black-trans'
  appLogo = null, // 'growth-plan' | 'growth-plan-builder'
  size = 'medium', // 'small' | 'medium' | 'large' | 'xlarge' | number
  className = '',
  alt = ''
}) {
  let src = '';
  let altText = alt;
  
  if (type === 'dimension' && dimension) {
    // Dimension logo: Faith-standard.png (capitalized dimension, lowercase variant)
    const capitalizedDimension = dimension.charAt(0).toUpperCase() + dimension.slice(1);
    src = `/assets/logos/${capitalizedDimension}-${variant}.png`;
    altText = alt || `${capitalizedDimension} logo`;
  } else if (type === 'app' && appLogo) {
    // App logos are all lowercase
    src = `/assets/logos/${appLogo}.png`;
    altText = alt || appLogo.replace(/-/g, ' ');
  }

  // Size mapping
  let sizeStyle = {};
  if (typeof size === 'number') {
    sizeStyle = { width: size, height: size };
  }

  const logoClasses = [
    'logo',
    typeof size === 'string' ? `logo--${size}` : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <img 
      src={src}
      alt={altText}
      className={logoClasses}
      style={sizeStyle}
      loading="lazy"
    />
  );
}
