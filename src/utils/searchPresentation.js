export function getTypeIcon(type) {
  return {
    block: "Bk",
    transaction: "Tx",
    address: "Ad",
    contract: "Ct",
    token: "Tk",
  }[type] || "?";
}

export function getTypeIconClass(type) {
  return {
    block: "bg-primary-100 dark:bg-primary-900/30 text-primary-600",
    transaction: "bg-green-100 dark:bg-green-900/30 text-green-600",
    address: "bg-orange-100 dark:bg-orange-900/30 text-orange-600",
    contract: "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
    token: "bg-primary-100 dark:bg-primary-900/30 text-primary-600",
  }[type] || "bg-primary-100 dark:bg-primary-900/30 text-primary-600";
}

export function getTypeBadgeClass(type) {
  return {
    block: "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400",
    transaction: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    address: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    contract: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    token: "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400",
  }[type] || "bg-gray-100 text-gray-600";
}
