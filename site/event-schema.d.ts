// Generated from event-schema.yaml by tools/gen-event-types.mjs. Do not edit.
export interface AnalyticsEvents {
  /** First interaction with the free-quote form. Top of the quote funnel. */
  quote_started: { } | undefined;
  /** The quote form passed validation and the visitor's email app was asked to open the request (also fires on "Open my email app again"). Primary conversion. */
  quote_mailto_opened: { service: "grounds-maintenance" | "landscape-installation" | "irrigation" | "tree-vegetation" | "multiple" | "none"; area: "victoria" | "saanich" | "oak-bay" | "esquimalt" | "langford" | "colwood" | "view-royal" | "sooke" | "central-saanich" | "north-saanich" | "sidney" | "highlands" | "metchosin" | "none"; };
  /** The visitor copied the request text or the email address from the after-submit panel (fallback when no email app opened). */
  quote_copied: { item?: "request" | "address"; };
  /** The visitor used a Gmail or Outlook.com compose link from the after-submit panel. */
  quote_webmail_opened: { provider: "gmail" | "outlook"; };
  /** A tel link was tapped. Secondary conversion; location shows which placement earned it. */
  call_click: { location: string; };
  /** An sms link was tapped. */
  sms_click: { location: string; };
  /** A mailto link (outside the quote form) was clicked. Secondary contact signal. */
  email_click: { location: string; };
  /** Commercial or public buyer downloaded the capability statement PDF. B2B intent signal. */
  capability_statement_downloaded: { } | undefined;
}
