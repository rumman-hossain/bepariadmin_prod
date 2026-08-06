import { useCallback, useRef, useState } from 'react';

/**
 * Captures the device's position — and admits when it could not.
 *
 * # Why this is a hook and not three lines inline
 *
 * The prototype does this:
 *
 *     if (autoGeoTag && navigator.geolocation) {
 *       try { ...getCurrentPosition... } catch (e) { console.error(e); }
 *     }
 *
 * A denied permission is caught, logged to a console nobody has open, and the
 * form submits with `latitude: undefined`. The operator ticked a box that said
 * "auto geo-tag location" and got a retailer with no location, with nothing on
 * screen to say so. Nobody finds out until somebody opens the record months
 * later and wonders why the shop has no position.
 *
 * Failure is a state here, with its own message, and the caller renders it.
 *
 * # What this coordinate actually is
 *
 * Wherever the device is at the moment the button is pressed. That is the shop
 * only if the operator is standing in it. Somebody adding a retailer from the
 * office tags the office — so the control that uses this hook labels the value
 * "device location at capture", never "shop location". The honest label is the
 * whole reason the data is worth keeping.
 */

export interface DevicePosition {
  latitude: number;
  longitude: number;
  /** Metres. A 2,000 m reading is a wifi guess, not a GPS fix, and shows as one. */
  accuracy: number;
}

export type LocationStatus = 'idle' | 'locating' | 'captured' | 'failed';

/**
 * Ten seconds, and no cached fix.
 *
 * `maximumAge: 0` matters: the default lets the browser hand back a position
 * from an earlier page in the session, which for a field agent moving between
 * shops means tagging the previous shop. A stale coordinate is worse than none,
 * because it looks exactly like a real one.
 */
const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};

/** GeolocationPositionError codes, named. `1`, `2`, `3` say nothing at a call site. */
const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

function messageFor(err: GeolocationPositionError): string {
  switch (err.code) {
    case PERMISSION_DENIED:
      // Not phrased as a fault. Refusing is a legitimate thing to have done, and
      // wording it as an error sends people hunting for a bug that is not there.
      return 'Location permission was declined. You can allow it in your browser and try again, or leave this blank.';
    case TIMEOUT:
    case POSITION_UNAVAILABLE:
      // Deliberately one message for both. Indoors — which a market building is
      // — these are indistinguishable to the person holding the phone, and the
      // action is the same either way.
      return 'Could not get a fix. Move somewhere with a clearer view of the sky and try again.';
    default:
      return 'Could not get a fix. Please try again.';
  }
}

export function useDeviceLocation() {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [position, setPosition] = useState<DevicePosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  // getCurrentPosition has no cancel. If the component unmounts mid-fix the
  // callback still fires, so it is gated rather than left to set state on a
  // dead component.
  const live = useRef(true);

  const capture = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('failed');
      setPosition(null);
      setError('This browser does not support location capture. Please enter the address instead.');
      return;
    }

    live.current = true;
    setStatus('locating');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!live.current) return;
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus('captured');
        setError(null);
      },
      (err) => {
        if (!live.current) return;
        setPosition(null);
        setStatus('failed');
        setError(messageFor(err));
      },
      GEO_OPTIONS,
    );
  }, []);

  /**
   * Discards a captured position.
   *
   * An operator who captures at the office and then realises has to be able to
   * take it back; without this the only way to remove a wrong coordinate is to
   * abandon the form and start again.
   */
  const clear = useCallback(() => {
    live.current = false;
    setPosition(null);
    setStatus('idle');
    setError(null);
  }, []);

  return { status, position, error, capture, clear };
}
