export interface IntegrityMember {
    id: string;
    relation: string;
    gender?: string | null;
    fatherId: string | null;
    motherId: string | null;
    spouseIds: string[];
}
export type IntegrityIssueCode = "SELF_PARENT" | "SELF_SPOUSE" | "MISSING_PARENT" | "MISSING_SPOUSE" | "INVALID_PARENT_GENDER" | "ASYMMETRIC_SPOUSE" | "ANCESTRY_CYCLE" | "DUPLICATE_PARENT" | "MULTIPLE_SELF" | "RELATION_MISMATCH";
export interface IntegrityIssue {
    code: IntegrityIssueCode;
    severity: "ERROR" | "WARNING";
    memberId: string;
    relatedMemberId?: string;
    message: string;
}
export declare function checkFamilyTreeIntegrity(members: IntegrityMember[]): IntegrityIssue[];
//# sourceMappingURL=family-tree-integrity.d.ts.map