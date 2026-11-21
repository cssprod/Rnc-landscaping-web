// Generated from event-schema.yaml by tools/gen-event-types.mjs. Do not edit.
export interface AnalyticsEvents {
  /** First interaction with the quote form. Top of the quote funnel. */
  quote_started: { } | undefined;
  /** "Deprecated: removed by quote in W2 (CONTRACT §13; use the quote_mailto_opened / quote_copied / quote_webmail_opened outcomes). A quote step passed validation (v2 4-step form)." */
  quote_step_completed: { step: number; };
  /** "Deprecated: removed by quote in W2 (CONTRACT §13; use quote_mailto_opened). Quote form passed validation and the visitor's email app was opened with the request." */
  quote_submitted: { service: "grounds-maintenance" | "landscape-installation" | "irrigation" | "tree-vegetation" | "not-sure"; };
  /** "Deprecated: removed by quote in W2 (CONTRACT §13; use call_click). A tel link was tapped." */
  call_clicked: { location: string; };
  /** "Deprecated: removed by quote in W2 (CONTRACT §13; use email_click). A mailto link was clicked." */
  email_clicked: { location: string; };
  /** Commercial or public buyer downloaded the capability statement PDF. B2B intent signal. */
  capability_statement_downloaded: { } | undefined;
  /** The quote builder opened the visitor's email app with the composed request. Primary conversion. */
  quote_mailto_opened: { service: string; area: string; };
  /** The visitor copied the composed quote request from the ready panel. */
  quote_copied: { } | undefined;
  /** The visitor opened the composed quote request in a webmail compose window. */
  quote_webmail_opened: { provider: "gmail" | "outlook"; };
  /** A tel link was tapped. Secondary conversion; location shows which placement earned it. */
  call_click: { location: string; };
  /** An sms link was tapped. Secondary conversion. */
  sms_click: { location: string; };
  /** A mailto link was clicked. Secondary contact signal. */
  email_click: { location: string; };
}
