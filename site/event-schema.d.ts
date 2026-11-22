// Generated from event-schema.yaml by tools/gen-event-types.mjs. Do not edit.
export interface AnalyticsEvents {
  /** First edit in the quote builder (sent once per page view). Top of the quote funnel. */
  quote_started: { } | undefined;
  /** @deprecated v2 name, still sent by the chrome until ds-chrome renames it (CONTRACT §13; use call_click). Delete once nothing emits it. A tel link was tapped. */
  call_clicked: { location: string; };
  /** @deprecated v2 name, still sent by the chrome until ds-chrome renames it (CONTRACT §13; use email_click). Delete once nothing emits it. A mailto link was clicked. */
  email_clicked: { location: string; };
  /** Commercial or public buyer downloaded the capability statement PDF. B2B intent signal. */
  capability_statement_downloaded: { } | undefined;
  /** The quote builder opened the visitor's email app with the composed request. Primary conversion. */
  quote_mailto_opened: { service: "grounds-maintenance" | "landscape-installation" | "irrigation" | "tree-vegetation" | "multiple" | "not-sure"; area: string; };
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
