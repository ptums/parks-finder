import { useEffect, useRef, type ReactNode } from 'react';
import type { Park } from '../../../../shared/parks';
import { amenityLabel } from '../../../../shared/amenities';
import { focusById } from '../../a11y/focus';
import { PARKS } from '../../data/parks';
import { useAppState, useDispatch, useSelectedPark } from '../../state/AppState';
import { ParkImage } from './ParkImage';
import './ParkDetails.css';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function sizeAndRating(park: Park): string[] {
  const lines: string[] = [];
  if (park.acreage !== undefined) {
    lines.push(`${park.acreage} ${park.acreage === 1 ? 'acre' : 'acres'}`);
  }
  if (park.rating !== undefined) lines.push(`Rated ${park.rating} out of 5`);
  return lines;
}

function ParkDialog({ park }: { park: Park }) {
  const dispatch = useDispatch();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    headingRef.current?.focus();
    // Only the backdrop reports the dialog itself as the click target.
    const onBackdropClick = (event: MouseEvent) => {
      if (event.target === dialog) dispatch({ type: 'closeDetails' });
    };
    dialog.addEventListener('click', onBackdropClick);
    return () => dialog.removeEventListener('click', onBackdropClick);
  }, [dispatch]);

  const close = () => dispatch({ type: 'closeDetails' });
  const stats = sizeAndRating(park);
  const firstImage = park.images[0];

  return (
    <dialog
      ref={dialogRef}
      className="park-details"
      aria-labelledby="park-details-heading"
      onCancel={(event) => {
        // Let React unmount the dialog instead of the browser closing it behind our back.
        event.preventDefault();
        close();
      }}
    >
      <div className="park-details-body">
        <div className="park-details-header">
          <h2 id="park-details-heading" ref={headingRef} tabIndex={-1}>
            {park.name}
          </h2>
          <button type="button" className="park-details-close" onClick={close}>
            Close
          </button>
        </div>
        {firstImage ? (
          <ParkImage key={park.id} src={firstImage} name={park.name} />
        ) : (
          <p>Photos not listed</p>
        )}
        {park.description && <p>{park.description}</p>}
        <Section title="Amenities">
          {park.amenities.length > 0 ? (
            <ul>
              {park.amenities.map((slug) => (
                <li key={slug}>{amenityLabel(slug)}</li>
              ))}
            </ul>
          ) : (
            <p>Not listed</p>
          )}
        </Section>
        <Section title="Address">
          <p>{park.address ?? 'Not listed'}</p>
        </Section>
        <Section title="Hours">
          <p>{park.hours ?? 'Not listed'}</p>
        </Section>
        <Section title="Size and rating">
          {stats.length > 0 ? stats.map((line) => <p key={line}>{line}</p>) : <p>Not listed</p>}
        </Section>
        <Section title="Contact">
          <p>Contact information not listed</p>
        </Section>
      </div>
    </dialog>
  );
}

export function ParkDetails({ parks = PARKS }: { parks?: Park[] }) {
  const park = useSelectedPark(parks);
  const { returnFocusId } = useAppState();
  const wasOpen = useRef(false);

  // After the dialog is gone, send focus back to the trigger (or the directory heading).
  useEffect(() => {
    if (park) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    focusById(returnFocusId);
    if (document.activeElement === document.body || document.activeElement === null) {
      focusById('directory-heading');
    }
  }, [park, returnFocusId]);

  return park ? <ParkDialog key={park.id} park={park} /> : null;
}
