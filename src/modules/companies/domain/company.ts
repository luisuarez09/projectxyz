export type CompanyStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type CompanySummary = {
  id: string;
  version: number;
  legalName: string;
  tradeName: string | null;
  rif: string;
  activity: string | null;
  taxpayerType: string | null;
  servicePlan: string | null;
  responsibleName: string | null;
  status: CompanyStatus;
  branchesCount: number;
};

export type CompanyBranchInput = {
  id?: string;
  name: string;
  code: string;
  address: string;
};

export type CompanyOfficerInput = {
  id?: string;
  position: string;
  fullName: string;
  termStartsAt: string;
  termEndsAt: string;
};

export type CompanyMunicipalActivityInput = {
  id?: string;
  branchName: string;
  jurisdiction: string;
  economicActivity: string;
  rate: string;
  effectiveFrom: string;
  source: string;
};

export type CompanyFormData = {
  version?: number;
  legalName: string;
  tradeName: string;
  rif: string;
  activity: string;
  taxpayerType: string;
  fiscalAddress: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  responsibleProfileId: string;
  servicePlan: string;
  ivssEmployerNumber: string;
  faovPayrollNumber: string;
  incorporationDate: string;
  commercialRegistry: string;
  registryFolio: string;
  registryDocument: string;
  shareCapital: string;
  incesRncp: string;
  legalRepresentativeName: string;
  legalRepresentativeDocument: string;
  legalRepresentativePhone: string;
  legalRepresentativeEmail: string;
  clientPortalEnabled: boolean;
  restrictedTaxAccessEnabled: boolean;
  branches: CompanyBranchInput[];
  officers: CompanyOfficerInput[];
  taxOfferingKeys: string[];
  serviceOfferingKeys: string[];
  municipalActivities: CompanyMunicipalActivityInput[];
};

export type CompanyDetail = CompanyFormData & CompanySummary;

export type CompanyStaffOption = {
  id: string;
  name: string;
};

export type CompanyOfferingOption = {
  id: string;
  name: string;
  organism: string;
  cadence: string;
  kind: "TAX" | "SERVICE";
  taxpayerCondition: "ORDINARY" | "SPECIAL_TAXPAYER" | "ALL";
};

export function offeringAppliesToCompany(
  offering: CompanyOfferingOption,
  taxpayerType: string,
) {
  if (offering.kind === "SERVICE" || offering.taxpayerCondition === "ALL")
    return true;
  const isSpecialTaxpayer = taxpayerType
    .trim()
    .toLocaleLowerCase("es")
    .includes("especial");
  return offering.taxpayerCondition === "SPECIAL_TAXPAYER"
    ? isSpecialTaxpayer
    : !isSpecialTaxpayer;
}

export const emptyCompanyForm: CompanyFormData = {
  legalName: "",
  tradeName: "",
  rif: "",
  activity: "",
  taxpayerType: "",
  fiscalAddress: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  responsibleProfileId: "",
  servicePlan: "",
  ivssEmployerNumber: "",
  faovPayrollNumber: "",
  incorporationDate: "",
  commercialRegistry: "",
  registryFolio: "",
  registryDocument: "",
  shareCapital: "",
  incesRncp: "",
  legalRepresentativeName: "",
  legalRepresentativeDocument: "",
  legalRepresentativePhone: "",
  legalRepresentativeEmail: "",
  clientPortalEnabled: false,
  restrictedTaxAccessEnabled: false,
  branches: [],
  officers: [],
  taxOfferingKeys: [],
  serviceOfferingKeys: [],
  municipalActivities: [],
};
