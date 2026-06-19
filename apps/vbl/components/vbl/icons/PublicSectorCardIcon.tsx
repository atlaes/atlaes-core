import React from 'react';

// Figma Entry-A card icon for "Public sector refund claim" — a stylised
// classical government/pillar building. Inlined so it ships with source
// code instead of the gitignored apps/vbl/public/ folder.
export const PublicSectorCardIcon: React.FC<{ className?: string }> = ({
  className,
}) => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M37.7908 14.6426H10.2109V18.5297H37.7908V14.6426Z" fill="#292D32" />
    <path
      d="M12.9375 35.2303V47.9994H18.2021V37.6479H21.3669V47.9994H26.6315V37.6479H29.7964V47.9994H35.061V35.2303L23.9992 31.7793L12.9375 35.2303Z"
      fill="#9EA1A1"
    />
    <path
      d="M0 21.6953V48H9.77343V32.9032L24 28.4647L38.2266 32.9032V48H48V21.6953H0Z"
      fill="#292D32"
    />
    <path
      d="M25.5816 4.43953V0H22.4168V4.43953C18.518 5.03747 15.3382 7.8106 14.1562 11.4784H33.8423C32.6602 7.8106 29.4805 5.03747 25.5816 4.43953Z"
      fill="#292D32"
    />
  </svg>
);

export default PublicSectorCardIcon;
