import { useQuery } from '@tanstack/react-query';
import { MessageSquareWarning } from 'lucide-react';
import { Panel } from '@/src/components/layout/primitives';
import { Text } from '@/src/components/data';
import { getSmsBalance } from '@/src/api/dashboard';

/**
 * SMS CREDIT REMAINING — the number that silently stops every sign-in.
 *
 * When it runs out the gateway rejects the send, the login screen still says a
 * code was sent, and nobody learns why until somebody cannot get in — usually a
 * supplier, at the worst possible moment. There is no error anywhere for an
 * operator to see, because from the app's point of view nothing failed.
 *
 * So it goes on the dashboard, where it is read daily rather than looked up
 * after the fact.
 *
 * # The threshold
 *
 * Below 500 the card turns red and asks for a top-up. That is a WARNING level,
 * not empty: a number that only shouts at zero shouts too late, because by then
 * the outage has already started.
 *
 * # Three states, deliberately
 *
 *   not configured  no gateway is wired. NOT the same as a zero balance, and it
 *                   needs the opposite response — a deployment question, not a
 *                   payment. Showing "0" here would have somebody topping up an
 *                   account nothing is using.
 *   unavailable     the provider could not be reached. The figure is unknown,
 *                   which is not the same as low; saying "0" would be a
 *                   confident wrong number.
 *   a figure        what is actually left.
 */

/** Below this, the card asks for a top-up. */
export const LOW_BALANCE_THRESHOLD = 500;

export function SmsBalanceCard() {
  const query = useQuery({
    queryKey: ['dashboard', 'sms-balance'],
    queryFn: getSmsBalance,
    /*
     * A minute is plenty. This is a slowly-moving figure and every read costs a
     * round trip to an external provider — polling it hard would spend real
     * money's worth of requests to watch a number that changes when an SMS is
     * sent.
     */
    staleTime: 60_000,
    retry: false,
  });

  // Already unwrapped by getSmsBalance — see the note there on the double
  // envelope that made this card report "Not configured" for a live gateway.
  const data = query.data;

  let tone: 'normal' | 'low' | 'unknown' = 'unknown';
  let value = '—';
  let note = 'Checking the gateway…';

  if (query.isError || (data && data.configured && data.available === false)) {
    tone = 'unknown';
    value = '—';
    note = 'The SMS gateway could not be reached. The figure below is unknown, not zero.';
  } else if (data && !data.configured) {
    tone = 'unknown';
    value = 'Not configured';
    note = 'No SMS gateway is wired on this environment.';
  } else if (data && typeof data.balance === 'number') {
    const low = data.balance < LOW_BALANCE_THRESHOLD;
    tone = low ? 'low' : 'normal';
    value = `৳ ${data.balance.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;
    note = low
      ? 'Please recharge — sign-in codes stop when this runs out.'
      : 'Sign-in and password-reset codes are sent from this balance.';
  }

  /*
   * The red is on the CARD, not just the text. A low balance has to be visible
   * from across the room on a screen full of other numbers; a red digit among
   * black ones is easy to scroll past.
   */
  const isLow = tone === 'low';

  return (
    <Panel
      title="SMS balance (Zaman IT)"
      className={isLow ? 'border-danger bg-danger/10' : undefined}
    >
      <div className="flex items-start gap-3">
        {isLow && (
          <MessageSquareWarning
            className="mt-0.5 h-5 w-5 shrink-0 text-danger"
            aria-hidden="true"
          />
        )}
        <div className="flex flex-col gap-1">
          <span
            className={
              isLow
                ? 'text-2xl font-semibold tabular-nums text-danger'
                : 'text-2xl font-semibold tabular-nums'
            }
          >
            {value}
          </span>
          {/*
            role="alert" only when it is actually low. Announcing a healthy
            balance on every dashboard load would train an operator to ignore
            the one time it matters.
          */}
          <Text variant="caption" {...(isLow ? { role: 'alert' } : {})}>
            {note}
          </Text>
        </div>
      </div>
    </Panel>
  );
}
