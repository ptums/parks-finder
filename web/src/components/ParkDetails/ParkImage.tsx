import { useState } from 'react';

/** First image of a park in a fixed 16:9 box. A failed load swaps to a labeled placeholder. */
export function ParkImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="park-image-box">
      {failed ? (
        <div role="img" aria-label={`Photo of ${name} unavailable`} className="park-image-missing">
          <span>Image unavailable</span>
        </div>
      ) : (
        // The alt text format "Photo of {name}" is required by the ticket.
        // eslint-disable-next-line jsx-a11y/img-redundant-alt, jsx-a11y/no-noninteractive-element-interactions
        <img src={src} alt={`Photo of ${name}`} loading="lazy" onError={() => setFailed(true)} />
      )}
    </div>
  );
}
