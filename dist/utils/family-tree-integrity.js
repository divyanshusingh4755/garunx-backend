export function checkFamilyTreeIntegrity(members) {
    const byId = new Map(members.map((m) => [m.id, m]));
    const issues = [];
    const seen = new Set();
    const add = (issue) => {
        const key = [issue.code, issue.memberId, issue.relatedMemberId ?? ""].join(":");
        if (seen.has(key))
            return;
        seen.add(key);
        issues.push(issue);
    };
    const selfMembers = members.filter((m) => m.relation === "SELF");
    if (selfMembers.length > 1) {
        for (const member of selfMembers) {
            add({ code: "MULTIPLE_SELF", severity: "ERROR", memberId: member.id, message: "Multiple active SELF members exist" });
        }
    }
    for (const member of members) {
        const parents = [
            { id: member.fatherId, type: "FATHER" },
            { id: member.motherId, type: "MOTHER" },
        ];
        if (member.fatherId && member.fatherId === member.motherId) {
            add({
                code: "DUPLICATE_PARENT",
                severity: "ERROR",
                memberId: member.id,
                message: "The same member is linked as father and mother",
            });
        }
        for (const { id, type } of parents) {
            if (!id)
                continue;
            if (id === member.id) {
                add({ code: "SELF_PARENT", severity: "ERROR", memberId: member.id, message: `Member cannot be their own ${type.toLowerCase()}` });
                continue;
            }
            const parent = byId.get(id);
            if (!parent) {
                add({ code: "MISSING_PARENT", severity: "ERROR", memberId: member.id, relatedMemberId: id, message: `${type} references a missing or deleted member` });
                continue;
            }
            const gender = parent.gender?.toUpperCase();
            if ((type === "FATHER" && gender === "FEMALE") || (type === "MOTHER" && gender === "MALE")) {
                add({ code: "INVALID_PARENT_GENDER", severity: "ERROR", memberId: member.id, relatedMemberId: id, message: `${type} has a conflicting gender` });
            }
        }
        for (const spouseId of new Set(member.spouseIds)) {
            if (spouseId === member.id) {
                add({ code: "SELF_SPOUSE", severity: "ERROR", memberId: member.id, message: "Member cannot be their own spouse" });
                continue;
            }
            const spouse = byId.get(spouseId);
            if (!spouse) {
                add({ code: "MISSING_SPOUSE", severity: "WARNING", memberId: member.id, relatedMemberId: spouseId, message: "Spouse references a missing or deleted member" });
                continue;
            }
            if (!spouse.spouseIds.includes(member.id)) {
                add({ code: "ASYMMETRIC_SPOUSE", severity: "WARNING", memberId: member.id, relatedMemberId: spouseId, message: "Spouse relationship is not reciprocal" });
            }
        }
    }
    // DFS detects cycles across father and mother links.
    const visited = new Set();
    const active = new Set();
    const visit = (id) => {
        if (active.has(id) || visited.has(id))
            return;
        visited.add(id);
        active.add(id);
        const member = byId.get(id);
        for (const parentId of [member?.fatherId, member?.motherId]) {
            if (!parentId || !byId.has(parentId))
                continue;
            if (active.has(parentId)) {
                add({ code: "ANCESTRY_CYCLE", severity: "ERROR", memberId: id, relatedMemberId: parentId, message: "Cycle detected in parent ancestry" });
            }
            else {
                visit(parentId);
            }
        }
        active.delete(id);
    };
    for (const member of members) {
        visit(member.id);
    }
    // Only compare labels that can be proven through direct connections to the SELF member.
    if (selfMembers.length === 1) {
        const self = selfMembers[0];
        if (self) {
            for (const member of members) {
                if (member.id === self.id)
                    continue;
                const expected = member.id === self.fatherId ? "FATHER" : member.id === self.motherId ? "MOTHER" : null;
                if (!expected)
                    continue;
                if (member.relation !== expected) {
                    add({
                        code: "RELATION_MISMATCH",
                        severity: "WARNING",
                        memberId: member.id,
                        relatedMemberId: self.id,
                        message: `Stored relation ${member.relation} conflicts with direct ${expected} connection to SELF`,
                    });
                }
            }
        }
    }
    return issues;
}
//# sourceMappingURL=family-tree-integrity.js.map