import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { contactsApi } from "@/api/contactsApi";
import { balancesApi } from "@/api/balancesApi";
import { groupsApi } from "@/api/groupsApi";
import { queryKeys } from "@/api/queryKeys";
import { formatGroupName } from "@/utils/group";
import type { ApiContactResponse, ApiGroupResponse, ApiContactBalanceByGroup } from "@/types";
import type { ContactBalanceRow } from "@/types";

const CONTACTS_LIMIT = 100;

export function useContactsData() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [expandedContactUserId, setExpandedContactUserId] = useState<number | null>(null);
  const [contactSearch, setContactSearch] = useState("");

  const {
    data: contacts = [],
    isLoading: contactsLoading,
    error: contactsError,
  } = useQuery<ApiContactResponse[]>({
    queryKey: queryKeys.contacts.list({ limit: CONTACTS_LIMIT, offset: 0 }),
    queryFn: () => contactsApi.list({ limit: CONTACTS_LIMIT, offset: 0 }),
    enabled: !!user,
  });

  const {
    data: groups = [],
    isLoading: groupsLoading,
    error: groupsError,
  } = useQuery<ApiGroupResponse[]>({
    queryKey: queryKeys.groups.all,
    queryFn: () => groupsApi.listAll(),
    enabled: !!user,
  });

  const contactBreakdownQueries = useQueries({
    queries: contacts.map((contact) => ({
      queryKey: queryKeys.balances.contactByGroups(contact.contact_id),
      queryFn: () => balancesApi.getContactByGroups(contact.contact_id),
      enabled: !!user,
    })),
  });

  const groupById = useMemo(() => {
    return groups.reduce<Record<number, ApiGroupResponse>>((accumulator, group) => {
      accumulator[group.id] = group;
      return accumulator;
    }, {});
  }, [groups]);

  const breakdownByContactId = useMemo(() => {
    return contacts.reduce<Record<number, ApiContactBalanceByGroup[]>>((accumulator, contact, index) => {
      accumulator[contact.contact_id] = contactBreakdownQueries[index]?.data ?? [];
      return accumulator;
    }, {});
  }, [contacts, contactBreakdownQueries]);

  const breakdownLoadingByContactId = useMemo(() => {
    return contacts.reduce<Record<number, boolean>>((accumulator, contact, index) => {
      accumulator[contact.contact_id] = contactBreakdownQueries[index]?.isLoading ?? false;
      return accumulator;
    }, {});
  }, [contacts, contactBreakdownQueries]);

  const breakdownErrorByContactId = useMemo(() => {
    return contacts.reduce<Record<number, boolean>>((accumulator, contact, index) => {
      accumulator[contact.contact_id] = Boolean(contactBreakdownQueries[index]?.error);
      return accumulator;
    }, {});
  }, [contacts, contactBreakdownQueries]);

  const contactRows = useMemo(() => {
    return contacts
      .map<ContactBalanceRow>((contact) => {
        const breakdown = breakdownByContactId[contact.contact_id] ?? [];

        const currencyTotals = breakdown.reduce<Record<string, number>>((accumulator, item) => {
          const groupCurrency =
            groupById[item.group_id]?.currency ?? item.group_currency ?? t("contactsBalancesPage.unknownCurrency");
          accumulator[groupCurrency] = (accumulator[groupCurrency] ?? 0) + Number(item.balance);
          return accumulator;
        }, {});

        const absoluteTotal = Object.values(currencyTotals).reduce((accumulator, amount) => {
          return accumulator + Math.abs(amount);
        }, 0);

        return {
          contact,
          currencyTotals,
          absoluteTotal,
        };
      })
      .sort((left, right) => right.absoluteTotal - left.absoluteTotal);
  }, [contacts, breakdownByContactId, groupById, t]);

  const filteredContactRows = useMemo(() => {
    const normalizedSearch = contactSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return contactRows;
    }

    return contactRows.filter((row) => {
      const username = row.contact.username.toLowerCase();
      const email = row.contact.email.toLowerCase();
      return username.includes(normalizedSearch) || email.includes(normalizedSearch);
    });
  }, [contactRows, contactSearch]);

  const expandedContactBreakdown = useMemo(() => {
    if (expandedContactUserId === null) {
      return [];
    }

    return breakdownByContactId[expandedContactUserId] ?? [];
  }, [expandedContactUserId, breakdownByContactId]);

  const expandedBreakdownLoading = expandedContactUserId !== null
    ? (breakdownLoadingByContactId[expandedContactUserId] ?? false)
    : false;

  const expandedBreakdownError = expandedContactUserId !== null
    ? (breakdownErrorByContactId[expandedContactUserId] ?? false)
    : false;

  const expandedGroupRows = useMemo(() => {
    return expandedContactBreakdown
      .map((row) => {
        const amount = Number(row.balance);
        const group = groupById[row.group_id];
        const fallbackGroupName = row.group_name ? formatGroupName(row.group_name) : null;
        return {
          groupId: row.group_id,
          amount,
          absoluteAmount: Math.abs(amount),
          groupName: group
            ? formatGroupName(group.name)
            : fallbackGroupName ?? t("contactsBalancesPage.unknownGroup", { groupId: row.group_id }),
          groupCurrency: group?.currency ?? row.group_currency ?? "",
        };
      })
      .filter((row) => row.amount !== 0)
      .sort((left, right) => right.absoluteAmount - left.absoluteAmount);
  }, [expandedContactBreakdown, groupById, t]);

  return {
    contacts,
    contactsLoading,
    contactsError,
    groupsLoading,
    groupsError,
    contactSearch,
    setContactSearch,
    expandedContactUserId,
    setExpandedContactUserId,
    filteredContactRows,
    breakdownByContactId,
    groupById,
    expandedBreakdownLoading,
    expandedBreakdownError,
    expandedGroupRows,
  };
}
