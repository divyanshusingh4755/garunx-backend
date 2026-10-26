export function deriveRelationships(members, selfId) {
    const byId = new Map(members.map((m) => [m.id, m]));
    const self = byId.get(selfId);
    if (!self)
        return [];
    const results = [];
    const seen = new Set();
    const genderRelation = (member, male, female) => {
        const gender = member.gender?.toLowerCase();
        if (gender === "male")
            return male;
        if (gender === "female")
            return female;
        return null;
    };
    const add = (memberId, relation, options = {}) => {
        if (!memberId || memberId === selfId)
            return;
        if (!byId.has(memberId))
            return;
        const key = [memberId, relation, options?.side ?? "", options?.viaMemberId ?? ""].join(":");
        if (seen.has(key))
            return;
        seen.add(key);
        results.push({ memberId, relation, ...options });
    };
    const sharesParent = (a, b) => {
        const sameFather = Boolean(a.fatherId && a.fatherId === b.fatherId);
        const sameMother = Boolean(a.motherId && a.motherId === b.motherId);
        return { sameFather, sameMother };
    };
    const siblingType = (a, b) => {
        const { sameFather, sameMother } = sharesParent(a, b);
        if (sameFather && sameMother)
            return "FULL";
        // IF both parents are known for both members, a single parent establishes a half sibling
        if (a.fatherId && a.motherId && b.fatherId && b.motherId) {
            return "HALF";
        }
        return "UNDETERMINED";
    };
    const siblingsOf = (person) => members.filter((candidate) => {
        if (candidate.id === person.id)
            return false;
        const shared = sharesParent(person, candidate);
        return shared.sameFather || shared.sameMother;
    });
    // Direct Parents
    add(self.fatherId, "FATHER");
    add(self.motherId, "MOTHER");
    // Grandparents and their side of the family
    const parents = [
        {
            id: self.fatherId,
            side: "PATERNAL"
        },
        {
            id: self.motherId,
            side: "MATERNAL"
        }
    ];
    for (const { id, side } of parents) {
        if (!id)
            continue;
        const parent = byId.get(id);
        if (!parent)
            continue;
        add(parent.fatherId, "GRANDFATHER", { side, viaMemberId: parent.id });
        add(parent.motherId, "GRANDMOTHER", { side, viaMemberId: parent.id });
    }
    // Siblings of SELF
    for (const sibling of siblingsOf(self)) {
        const relation = genderRelation(sibling, "BROTHER", "SISTER");
        if (!relation)
            continue;
        add(sibling.id, relation, { siblingType: siblingType(self, sibling) });
    }
    // Uncles and aunts. Their children are first cousins
    for (const { id: parentId, side } of parents) {
        if (!parentId)
            continue;
        const parent = byId.get(parentId);
        if (!parent)
            continue;
        for (const parentSibling of siblingsOf(parent)) {
            if (parentSibling.id === selfId)
                continue;
            const relation = genderRelation(parentSibling, "UNCLE", "AUNT");
            if (relation) {
                add(parentSibling.id, relation, { side, viaMemberId: parent.id, siblingType: siblingType(parent, parentSibling) });
            }
            // Cousins can be derived even if the parent's sibling has an unspecified gender.
            for (const candidate of members) {
                if (candidate.id === selfId)
                    continue;
                const isChild = candidate.fatherId === parentSibling.id || candidate.motherId === parentSibling.id;
                if (!isChild)
                    continue;
                add(candidate.id, "COUSIN", { side, viaMemberId: parentSibling.id });
            }
        }
    }
    return results;
}
//# sourceMappingURL=family-relationships.js.map