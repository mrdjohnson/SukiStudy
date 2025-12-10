import React from 'react';
import { Button as MantineButton, ButtonProps as MantineButtonProps } from '@mantine/core';

interface ButtonProps extends MantineButtonProps {
  isLoading?: boolean;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<any>;
  component?: any;
  href?: string;
  target?: string;
  title?: string;
  type?: "button" | "submit" | "reset";
  [key: string]: any; // Allow other style props or polymorphic props
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'filled', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  // Map our old variant names to Mantine's if necessary, or just pass through
  // Old: primary, secondary, outline, ghost
  // Mantine: filled, light, outline, subtle, transparent

  let mantineVariant = variant;
  if (variant === 'primary') mantineVariant = 'filled';
  if (variant === 'secondary') mantineVariant = 'light';
  if (variant === 'ghost') mantineVariant = 'subtle';

  let color = props.color;
  if (variant === 'secondary' && !color) color = 'teal';

  return (
    <MantineButton 
      variant={mantineVariant}
      loading={isLoading}
      className={className}
      color={color}
      {...props}
    >
      {children}
    </MantineButton>
  );
};