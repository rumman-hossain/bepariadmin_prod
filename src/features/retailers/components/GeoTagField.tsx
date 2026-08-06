import React from 'react';
import { MapPin, LoaderCircle, X } from 'lucide-react';
import { Button } from '@/src/components/controls';
import { Text } from '@/src/components/data';
import { Alert } from '@/src/components/feedback';
import { useDeviceLocation, type DevicePosition } from '../hooks/useDeviceLocation';

/**
 * Captures where the DEVICE is, and says that is what it captured.
 *
 * # The label is the feature
 *
 * The prototype calls this "Auto geo-tag location using device GPS" beside a
 * checkbox, which invites the reading "tag the shop's location". It does not do
 * that. It records where the browser is at the instant the button is pressed —
 * the shop only if the operator is standing in it, and the office if they are
 * adding the retailer from their desk.
 *
 * Both are legitimate; recording an office and calling it a shop is not. So the
 * control is labelled "device location", the caveat is on screen rather than in
 * a comment, and the value is captured by a deliberate press instead of a
 * checkbox that fires silently at submit.
 *
 * # Accuracy is shown
 *
 * A 2,000-metre reading is a wifi-triangulation guess covering half a
 * neighbourhood; a 12-metre one is a GPS fix. Identical-looking coordinates,
 * completely different worth, and only the accuracy figure tells them apart.
 */

export interface GeoTagFieldProps {
  latitude?: number;
  longitude?: number;
  onChange: (position: { latitude?: number; longitude?: number }) => void;
}

/** Metres beyond which a fix is a neighbourhood, not a shopfront. */
const COARSE_FIX_METRES = 100;

function Captured({
  position,
  onClear,
}: {
  position: DevicePosition;
  onClear: () => void;
}) {
  const coarse = position.accuracy > COARSE_FIX_METRES;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Text variant="strong" className="font-mono">
          {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
        </Text>
        <Text variant="caption">±{Math.round(position.accuracy)} m</Text>
        <Button variant="ghost" size="sm" iconLeft={X} onClick={onClear}>
          Remove
        </Button>
      </div>
      {coarse && (
        <Text variant="caption">
          That is a wide fix — accurate to about {Math.round(position.accuracy)} metres, which covers
          more than one shop. Capture again outdoors if you need the doorway.
        </Text>
      )}
    </div>
  );
}

export function GeoTagField({ latitude, longitude, onChange }: GeoTagFieldProps) {
  const { status, position, error, capture, clear } = useDeviceLocation();

  // The hook owns the freshly captured fix; the form owns whatever was saved
  // earlier. Showing the hook's value when it has one lets an operator replace a
  // stored coordinate and see the new one immediately.
  const shown: DevicePosition | null =
    position ??
    (latitude !== undefined && longitude !== undefined
      ? { latitude, longitude, accuracy: NaN }
      : null);

  const handleCapture = () => capture();

  /*
   * Push a captured fix up to the form.
   *
   * In an effect, not during render. The first version of this called onChange
   * inline in the render body, which sets state on the parent while this
   * component is rendering — React warns about it, and with a parent that
   * re-renders children it is a loop.
   *
   * `onChange` is deliberately absent from the dependency list: form handlers
   * are usually inline arrows, so including it would re-fire on every parent
   * render. The position is the only thing whose change should push a value.
   */
  React.useEffect(() => {
    if (!position) return;
    if (position.latitude === latitude && position.longitude === longitude) return;
    onChange({ latitude: position.latitude, longitude: position.longitude });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, latitude, longitude]);

  const handleClear = () => {
    clear();
    onChange({ latitude: undefined, longitude: undefined });
  };

  return (
    <div className="flex flex-col gap-2">
      <Text variant="label">Device location</Text>

      {shown ? (
        <Captured
          position={shown}
          onClear={handleClear}
        />
      ) : (
        <div>
          <Button
            variant="secondary"
            size="sm"
            iconLeft={status === 'locating' ? LoaderCircle : MapPin}
            onClick={handleCapture}
            loading={status === 'locating'}
            type="button"
          >
            {status === 'locating' ? 'Getting a fix…' : 'Use my current location'}
          </Button>
        </div>
      )}

      {/*
        The caveat, on screen. Without it this field reads as "the shop is here",
        which is only true when the operator is standing in the shop — and the
        person reading the record a year later has no way to know whether they
        were.
      */}
      <Text variant="caption">
        Records where this device is now, not where the shop is. Capture it while you are at the
        shop; from the office it will tag the office.
      </Text>

      {status === 'failed' && error && (
        <Alert tone="warn" title="No location captured">
          {error}
        </Alert>
      )}
    </div>
  );
}
