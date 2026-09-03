import { useEffect, useState } from 'react';
import { getMaterialFileContent } from '../api/material-files.api.js';
import { loadAuthenticatedImageBlob } from '../utils/authenticated-image-cache.js';
import Loader from './Loader.jsx';

/** Displays a protected image through an authenticated blob request. */
export default function AuthenticatedImage({
  fileUuid,
  alt,
  className,
  loadImage = getMaterialFileContent,
  cacheKey = fileUuid,
  fallbackSrc,
  fallbackAlt = 'Image de remplacement',
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setUrl('');
    setError(false);
    loadAuthenticatedImageBlob(loadImage, fileUuid)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cacheKey, fileUuid, loadImage]);

  if (error && fallbackSrc) {
    return <img className={className} src={fallbackSrc} alt={fallbackAlt} />;
  }
  if (error)
    return <div className={className} role="img" aria-label={`Image indisponible : ${alt}`} />;
  if (!url) return <Loader className={className} label="Chargement de l’image" size="sm" />;
  return <img className={className} src={url} alt={alt} />;
}
