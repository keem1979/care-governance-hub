/* eslint-disable @next/next/no-img-element */

type OrganisationDocumentBrandProps = {
  name: string;
  hasLogo: boolean;
};

export function OrganisationDocumentBrand({ name, hasLogo }: OrganisationDocumentBrandProps) {
  return (
    <div className="flex items-center gap-4">
      {hasLogo ? (
        <img
          src="/api/settings/policy-branding/logo"
          alt={`${name} logo`}
          className="h-16 w-24 rounded-lg border border-slate-200 bg-white object-contain p-2 print:h-14 print:w-20"
        />
      ) : null}
      <p data-document-brand className="font-bold uppercase tracking-widest text-emerald-800">{name}</p>
    </div>
  );
}
