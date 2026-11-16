import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/admin/admin-shell";

/**
 * The dashboard's own manual: one section per thing Georgia does here,
 * written as steps. Keep it in step with the features it describes — when a
 * screen changes, change its section.
 */

type Section = { id: string; title: string; intro?: string; blocks: Block[] };
type Block =
  | { kind: "steps"; title?: string; items: ReactNode[] }
  | { kind: "points"; title?: string; items: ReactNode[] }
  | { kind: "note"; text: ReactNode };

const go = (href: string, label: string) => (
  <Link href={href} className="underline underline-offset-4 hover:no-underline">
    {label}
  </Link>
);
const b = (text: string) => <strong className="font-semibold">{text}</strong>;

const sections: Section[] = [
  {
    id: "adding",
    title: "Adding a piece",
    intro: "Everything for a new listing is on one page, top to bottom.",
    blocks: [
      {
        kind: "steps",
        items: [
          <>Go to {go("/admin/pieces", "Pieces")} and choose {b("New piece")}.</>,
          <>{b("Photos")}: add as many as you like. The first one is the cover. Square photos look best. JPG, PNG and WebP all work; on an iPhone, photos are converted for you.</>,
          <>{b("Listing")}: the title, the description (leave a blank line between paragraphs) and the tags it belongs to.</>,
          <>{b("Selling")}: choose {b("One of a kind")} or {b("Made to order")}, then the price. One-of-a-kind pieces have a stock count, usually 1. Made-to-order pieces have a lead time in weeks instead, which buyers see.</>,
          <>{b("Details")}: size in words, dimensions, weight in pounds, food safe, dishwasher safe and care notes. All optional, and shown on the piece&apos;s page when filled in.</>,
          <>Choose {b("Publish")} to put it on the shop straight away, or {b("Save as draft")} to keep it private until you are ready.</>,
        ],
      },
      {
        kind: "note",
        text: "Shipping is free for the buyer, so set a price that already covers packing and postage.",
      },
    ],
  },
  {
    id: "managing",
    title: "Editing, hiding and removing pieces",
    blocks: [
      {
        kind: "points",
        items: [
          <>{b("Edit")}: open the piece from {go("/admin/pieces", "Pieces")}, change anything and choose {b("Save changes")}. Photos save as soon as you add or remove them.</>,
          <>{b("Unpublish")}: takes a piece off the shop and back to a draft. Nothing is lost.</>,
          <>{b("Mark sold")}: for a piece that sold in person. It stays on the shop with a Sold label, so people can still see it and ask for something similar. {b("Mark available")} undoes it.</>,
          <>{b("Archive")}: hides a piece from the shop and from your everyday list, but keeps it and its order history. Use this for anything that has been bought. {b("Restore")} brings it back as a draft.</>,
          <>{b("Delete")}: removes a piece and its photos for good. Only possible if nobody has ever paid for it; otherwise archive it.</>,
          <>{b("Order on the shop")}: use the up and down arrows in the Pieces list. Sold pieces always sink to the bottom of the shop on their own.</>,
        ],
      },
    ],
  },
  {
    id: "tags",
    title: "Tags, collections and Best Sellers",
    intro: "Tags are how the shop is sorted. A piece can carry several.",
    blocks: [
      {
        kind: "points",
        items: [
          <>Create, rename and reorder tags under {go("/admin/tags", "Tags")}. Each tag becomes a filter on the Shop page.</>,
          <>{b("Featured")}: a featured tag gets a large tile on the homepage, using a photo from one of its pieces. A tag with no photographed pieces gets no tile.</>,
          <>{b("Visible")}: turn this off to hide a tag from the shop&apos;s filters without removing it from pieces.</>,
          <>{b("Best Sellers")}: the homepage row shows pieces carrying a tag whose address is <code>best-sellers</code>. Create a tag named &ldquo;Best Sellers&rdquo; and add it to the pieces you want there. If no piece has it, the row shows the first three pieces for sale.</>,
          <>Each piece&apos;s page also shows a row of other pieces from the same collection.</>,
        ],
      },
    ],
  },
  {
    id: "orders",
    title: "Orders: what happens when someone buys",
    blocks: [
      {
        kind: "points",
        title: "Before any money moves",
        items: [
          <>In the cart the buyer gives their email and chooses {b("Free shipping")} or {b("Local pickup")}.</>,
          <>For shipping they enter the address in the cart. Only the lower 48 states and DC are accepted; anything else is refused before checkout.</>,
          <>When they press Check out, their pieces are held for 10 minutes so nobody else can buy them. If they do not pay in time, the pieces go back on sale by themselves.</>,
        ],
      },
      {
        kind: "points",
        title: "After they pay",
        items: [
          <>The order appears under {go("/admin/orders", "Orders")} as {b("To ship")}, the piece shows as Sold, the buyer gets a confirmation email and you get a New order email.</>,
          <>{b("Checking out")} and {b("Expired")} orders are checkouts that were started but not paid. They need nothing from you.</>,
        ],
      },
    ],
  },
  {
    id: "shipping",
    title: "Shipping an order",
    blocks: [
      {
        kind: "steps",
        items: [
          <>Open the order. The address is on the right.</>,
          <>Pack it, then under {b("Ship it")} enter the carrier and tracking number and choose {b("Mark shipped")}. The buyer is emailed the tracking details, with a tracking link for USPS, UPS and FedEx.</>,
          <>Typed the wrong number? The {b("Tracking")} box on a shipped order lets you correct it. Saving emails the buyer the new details.</>,
          <>When it arrives, choose {b("Mark delivered")}. The buyer gets a short thank-you with a link to the care guide.</>,
        ],
      },
    ],
  },
  {
    id: "pickup",
    title: "Local pickup orders",
    intro: "A pickup order has no address and no tracking. It moves through two steps.",
    blocks: [
      {
        kind: "steps",
        items: [
          <>When the order is wrapped and ready, open it and choose {b("Mark ready for pickup")}. The buyer is emailed your pickup instructions and asked to reply to arrange a time.</>,
          <>Once they have collected it, choose {b("Mark picked up")}. They get the thank-you with the care guide link.</>,
        ],
      },
      {
        kind: "note",
        text: <>The pickup wording buyers see, and whether pickup is offered at all, are under {go("/admin/settings", "Settings")}.</>,
      },
    ],
  },
  {
    id: "refunds",
    title: "Refunds and cancellations",
    blocks: [
      {
        kind: "steps",
        items: [
          <>Open the order and choose {b("View in Stripe")}.</>,
          <>Refund the payment there, in full or in part.</>,
          <>The order updates here on its own and the buyer is emailed the amount. A full refund marks the order Refunded and puts a one-of-a-kind piece back on sale; a partial refund is recorded on the order and leaves it open.</>,
        ],
      },
      {
        kind: "note",
        text: "Stripe keeps its processing fee when you refund. Damage claims and address problems are handled by replying to the buyer directly.",
      },
    ],
  },
  {
    id: "promo",
    title: "Promo codes",
    blocks: [
      {
        kind: "points",
        items: [
          <>Codes are created in Stripe, not here: Product catalog, then Coupons, then add a promotion code to the coupon.</>,
          <>Buyers enter the code on the payment page. The discount shows on the order, the confirmation email and the receipt.</>,
          <>A code that covers the whole order still creates a normal paid order.</>,
        ],
      },
    ],
  },
  {
    id: "emails",
    title: "Emails the shop sends for you",
    intro:
      "You never need to write these. Buyers can reply to any of them and the reply comes to the shop's inbox. You are copied on each one so you can see what was sent.",
    blocks: [
      {
        kind: "points",
        items: [
          <>{b("Order confirmation")}: when a payment succeeds. You get a separate New order email.</>,
          <>{b("Shipped")} and {b("Tracking updated")}: when you mark an order shipped or correct its tracking.</>,
          <>{b("Ready for pickup")}: when you mark a pickup order ready.</>,
          <>{b("Delivered")} or {b("Collected")}: when you mark an order delivered or picked up.</>,
          <>{b("Refunded")}: when you refund in Stripe.</>,
          <>{b("Commission request received")}: to anyone who sends the commission form. You get the request itself.</>,
          <>{b("Checkout reminders")} and the {b("newsletter welcome")}: see the next two sections.</>,
        ],
      },
      {
        kind: "note",
        text: <>To see them all, go to {go("/admin/settings", "Settings")} and use {b("Sample of every email")} to send yourself one of each. {b("Test email")} on the same page checks that sending works at all.</>,
      },
    ],
  },
  {
    id: "reminders",
    title: "Reminders for unfinished checkouts",
    intro: "When someone starts checking out and does not pay, the shop follows up for you.",
    blocks: [
      {
        kind: "points",
        items: [
          <>The first reminder goes out one hour later; a second and last one a day after that.</>,
          <>Nobody gets more than two reminders in a week, however many checkouts they abandon.</>,
          <>No reminder is sent if the piece has since sold, if the person came back and bought or started again, or if they asked not to be reminded.</>,
          <>Every reminder has a link to stop them.</>,
        ],
      },
    ],
  },
  {
    id: "newsletter",
    title: "Newsletter and marketing",
    blocks: [
      {
        kind: "points",
        items: [
          <>People join the list from the sign-up section above the footer on every page, or by ticking the box in the cart. The cart tick only counts once they have paid.</>,
          <>Each new subscriber gets one welcome email.</>,
          <>The list is under {go("/admin/subscribers", "Newsletter")}. {b("Copy all addresses")} copies it for pasting into an email tool.</>,
          <>Anyone who unsubscribes drops off the list straight away. Only write to people who are on it.</>,
        ],
      },
      {
        kind: "note",
        text: "The shop does not send newsletters itself yet. For now the list is for you to use with an email tool of your choice.",
      },
    ],
  },
  {
    id: "commissions",
    title: "Commission inquiries",
    blocks: [
      {
        kind: "points",
        items: [
          <>Requests from the Commissions page arrive by email and are kept under {go("/admin/inquiries", "Inquiries")}, so none is lost if an email goes astray.</>,
          <>Reply to the email to answer the person directly. They have already been told you will be in touch within a few days.</>,
          <>Move each inquiry along as it progresses: New, Replied, Quoted, In progress, Done or Declined. Notes on an inquiry are private.</>,
          <>A sold piece&apos;s page invites people to commission something like it, and tells you which piece they were looking at.</>,
        ],
      },
    ],
  },
  {
    id: "customers",
    title: "Customers",
    blocks: [
      {
        kind: "points",
        items: [
          <>{go("/admin/customers", "Customers")} lists everyone who has bought something, grouped by email, with how many orders and how much they have spent.</>,
          <>Being a customer does not put someone on the newsletter list. Only people who asked are on it.</>,
        ],
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    blocks: [
      {
        kind: "points",
        items: [
          <>{b("Notifications")}: the address New order and inquiry emails go to. Leave it blank to use your sign-in email.</>,
          <>{b("Local pickup")}: turn pickup on or off and edit the label and instructions buyers see.</>,
          <>{b("Sales tax")}: when on, Stripe works out and collects tax at checkout. Register for tax in Stripe before turning it on.</>,
          <>{b("Shipping")}: free on every order, continental US only. There is nothing to set.</>,
        ],
      },
    ],
  },
  {
    id: "trouble",
    title: "If something looks wrong",
    blocks: [
      {
        kind: "points",
        items: [
          <>{b("A paid order is not showing")}: wait a minute and refresh. If it still is not there, check the payment in Stripe and get in touch with whoever looks after the site.</>,
          <>{b("An email did not arrive")}: check spam, then send yourself a test from {go("/admin/settings", "Settings")}. The test shows the reason if sending is failing.</>,
          <>{b("A piece will not delete")}: it has been bought. Archive it instead.</>,
          <>{b("A photo will not upload")}: use a JPG, PNG or WebP file.</>,
          <>{b("Forgot your password")}: use the reset link on the sign-in page. A code is emailed to you.</>,
        ],
      },
    ],
  },
];

export default function AdminGuidePage() {
  return (
    <div>
      <PageHeader
        title="How it works"
        description="A step-by-step guide to everything in this dashboard."
      />
      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Guide sections" className="lg:sticky lg:top-6 lg:self-start">
          <ol className="grid gap-1.5 text-sm sm:grid-cols-2 lg:grid-cols-1">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-muted-foreground hover:text-foreground hover:underline">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex max-w-2xl flex-col gap-6">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-6 border border-border bg-card p-6"
            >
              <h2 className="font-display text-2xl">{section.title}</h2>
              {section.intro && <p className="mt-2 text-muted-foreground">{section.intro}</p>}
              {section.blocks.map((block, i) =>
                block.kind === "note" ? (
                  <p key={i} className="mt-5 bg-secondary px-4 py-3 text-sm leading-relaxed">
                    {block.text}
                  </p>
                ) : (
                  <div key={i} className="mt-5">
                    {block.title && <h3 className="mb-2 font-medium">{block.title}</h3>}
                    {block.kind === "steps" ? (
                      <ol className="list-decimal space-y-2.5 pl-5 leading-relaxed marker:text-muted-foreground">
                        {block.items.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ol>
                    ) : (
                      <ul className="space-y-2.5 leading-relaxed">
                        {block.items.map((item, j) => (
                          <li key={j} className="flex gap-3">
                            <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-primary" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ),
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
