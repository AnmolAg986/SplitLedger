
export const getFirstName = (fullName: string) => {
  if (!fullName) return '';
  if (fullName.toLowerCase() === 'you') return 'You';
  return fullName.trim().split(/\s+/)[0];
};

export const getSplitSummary = (participants: { display_name: string }[], totalMembers: number) => {
  if (!participants || participants.length === 0) return '';
  
  if (participants.length === totalMembers) {
    return 'Split among everyone';
  }
  
  if (participants.length === 1) {
    return `Split with ${getFirstName(participants[0].display_name)}`;
  }
  
  const names = participants.map(p => getFirstName(p.display_name));
  
  if (names.length <= 2) {
    return `Split among ${names.join(' & ')}`;
  }
  
  return `Split among ${names[0]}, ${names[1]} & ${names.length - 2} others`;
};
