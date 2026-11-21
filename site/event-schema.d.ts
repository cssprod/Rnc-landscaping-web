// Generated from event-schema.yaml by tools/gen-event-types.mjs. Do not edit.
export interface AnalyticsEvents {
  /** First interaction with the quote form. Top of the quote funnel. */
  quote_started: { } | undefined;
  /** A quote step passed validation. Shows where people drop out of the 4-step form (step 4 fires when the email is composed). */
  quote_step_completed: { step: number; };
  /** Quote form passed validation and the visitor's email app was opened with the request. Primary conversion. */
  quote_submitted: { service: "grounds-maintenance" | "landscape-installation" | "irrigation" | "tree-vegetation" | "not-sure"; };
  /** A tel link was tapped. Secondary conversion; location shows which placement earned it. */
  call_clicked: { location: string; };
  /** A mailto link was clicked. Secondary contact signal. */
  email_clicked: { location: string; };
  /** Commercial or public buyer downloaded the capability statement PDF. B2B intent signal. */
  capability_statement_downloaded: { } | undefined;
}
