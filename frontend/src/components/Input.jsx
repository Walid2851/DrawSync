import React from 'react';
import { clsx } from 'clsx';

const Input = ({
  label,
  error,
  className = '',
  ...props
}) => {
  const inputClasses = clsx(
    'input',
    error && 'border-red-500 focus:ring-red-500',
    className
  );

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Input; 