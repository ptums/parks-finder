import { useState } from 'react';
import type { ParkPhoto } from '../../../../shared/parks';

type ParkImageProps = { photo: ParkPhoto; name: string; index: number; total: number };

/** One park image in a fixed 16:9 box. A failed load swaps to a labeled placeholder. */
export function ParkImage({ photo, name, index, total }: ParkImageProps) {
  const [failed, setFailed] = useState(false);

  // One image reads "Photo of X"; several read "Photo 1 of 2: X" so they can be told apart.
  const label = total > 1 ? `Photo ${index + 1} of ${total}` : 'Photo';
  const fallbackAlt = total > 1 ? `${label}: ${name}` : `Photo of ${name}`;
  const alt = photo.alt ?? fallbackAlt;
  const missingLabel =
    total > 1 ? `${label} of ${name} unavailable` : `Photo of ${name} unavailable`;

  return (
    <div className="park-image-box">
      {failed ? (
        <div role="img" aria-label={missingLabel} className="park-image-missing">
          <span>Image unavailable</span>
        </div>
      ) : (
        // no-noninteractive-element-interactions: onError is a load event, not user interaction.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <img src={photo.src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      )}
    </div>
  );
}
