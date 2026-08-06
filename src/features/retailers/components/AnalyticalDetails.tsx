import { Select, Input } from '@/src/components/controls';
import { Text } from '@/src/components/data';
import {
  LOCATION_RANKING,
  MONTHLY_SALE,
  SHOP_TYPE,
  SHOP_DECOR,
} from '../constants/assessment';
import { GeoTagField } from './GeoTagField';
import type { Assessment } from '../schemas/retailerSchema';

/**
 * Analytical Details — what a field agent records after standing in the shop.
 *
 * Position on the goli, size, how it is kept, roughly what it turns over. All of
 * it optional, because most retailers have never been visited and an unvisited
 * shop is a state rather than missing data.
 *
 * # This is judgement, and the screen says so
 *
 * Nothing here is measured. Somebody looked at a shopfront and formed a view,
 * and six months later the only thing that makes that view worth anything is
 * knowing who formed it and when — which is why the detail screen shows the
 * assessor's name and date beside these values, and why the server stamps both
 * from the token rather than accepting them from the form.
 *
 * # What is deliberately absent
 *
 * A credit score. That column exists, is constrained 0–100, defaults to 50, and
 * nothing in the system ever writes it — every retailer reads 50. Offering it
 * here as an editable number would put a fabricated figure beside real ones,
 * which is how an operator learns to distrust the whole screen.
 */

export interface AnalyticalDetailsProps {
  values: Assessment;
  errors: Partial<Record<keyof Assessment, string>>;
  onChange: (patch: Partial<Assessment>) => void;
}

export function AnalyticalDetails({ values, errors, onChange }: AnalyticalDetailsProps) {
  /**
   * An empty number input is ABSENT, not zero.
   *
   * The prototype writes `parseInt(e.target.value) || 0`, which turns a cleared
   * field into "0 years in business" — a claim that the shop opened this year.
   * Undefined means nobody said.
   */
  const onYears = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') return onChange({ yearsInBusiness: undefined });
    const n = Number.parseInt(trimmed, 10);
    onChange({ yearsInBusiness: Number.isNaN(n) ? undefined : n });
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="analytical-heading">
      <div>
        <h2 id="analytical-heading" className="text-md font-semibold text-ink">
          Analytical details <span className="font-normal text-ink-3">(optional)</span>
        </h2>
        <Text variant="caption">
          What you saw when you visited. Leave it blank if you have not been — a blank record is
          honest, a guess is not.
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Location ranking"
          value={values.locationRanking ?? ''}
          onChange={(e) => onChange({ locationRanking: e.target.value })}
          options={[...LOCATION_RANKING]}
          placeholder="Not assessed"
          error={errors.locationRanking}
          hint="How much footfall the shopfront catches."
        />

        <Select
          label="Estimated monthly sale"
          value={values.estimatedMonthlySale ?? ''}
          onChange={(e) => onChange({ estimatedMonthlySale: e.target.value })}
          options={[...MONTHLY_SALE]}
          placeholder="Not assessed"
          error={errors.estimatedMonthlySale}
        />

        <Select
          label="Shop type"
          value={values.shopType ?? ''}
          onChange={(e) => onChange({ shopType: e.target.value })}
          options={[...SHOP_TYPE]}
          placeholder="Not assessed"
          error={errors.shopType}
        />

        <Select
          label="Shop decor"
          value={values.shopDecorType ?? ''}
          onChange={(e) => onChange({ shopDecorType: e.target.value })}
          options={[...SHOP_DECOR]}
          placeholder="Not assessed"
          error={errors.shopDecorType}
        />

        <Input
          label="Years in business"
          type="number"
          min={0}
          max={200}
          inputMode="numeric"
          value={values.yearsInBusiness ?? ''}
          onChange={(e) => onYears(e.target.value)}
          placeholder="e.g. 7"
          error={errors.yearsInBusiness}
          hint="As the owner reports it."
        />
      </div>

      <GeoTagField
        latitude={values.latitude}
        longitude={values.longitude}
        onChange={(pos) => onChange(pos)}
      />
    </section>
  );
}
