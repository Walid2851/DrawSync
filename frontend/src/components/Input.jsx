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
    error && 'input-error',
    className
  );

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label}
        </label>
      )}
      <input
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm font-medium text-red-600 flex items-center space-x-1">
          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

export default Input; 