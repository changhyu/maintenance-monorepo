import React from 'react';

export interface CardImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  position?: 'top' | 'bottom';
  objectFit?: 'cover' | 'contain' | 'fill';
  height?: string;
  className?: string;
}

export const CardImage: React.FC<CardImageProps> = ({
  src,
  alt,
  position = 'top',
  objectFit = 'cover',
  height = 'h-48',
  className = '',
  ...rest
}) => {
  // 이미지 위치에 따른 클래스
  const positionClasses = {
    top: 'rounded-t-lg mb-4',
    bottom: 'rounded-b-lg mt-4'
  };
  
  // objectFit에 따른 클래스
  const fitClasses = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill'
  };
  
  const imageClasses = `
    w-full
    ${height}
    ${fitClasses[objectFit]}
    ${positionClasses[position]}
    ${className}
  `.trim();
  
  return (
    <img
      src={src}
      alt={alt}
      className={imageClasses}
      {...rest}
    />
  );
};

CardImage.displayName = 'CardImage'; 