export interface RelationshipMember {
    id: string;
    fatherId: string | null;
    motherId: string | null;
    gender?: string | null;
}
export type DerivedRelation = "FATHER" | "MOTHER" | "GRANDFATHER" | "GRANDMOTHER" | "BROTHER" | "SISTER" | "UNCLE" | "AUNT" | "COUSIN";
export interface DerivedRelationship {
    memberId: string;
    relation: DerivedRelation;
    viaMemberId?: string;
    side?: "PATERNAL" | "MATERNAL";
    siblingType?: "FULL" | "HALF" | "UNDETERMINED";
}
export declare function deriveRelationships(members: RelationshipMember[], selfId: string): DerivedRelationship[];
//# sourceMappingURL=family-relationships.d.ts.map