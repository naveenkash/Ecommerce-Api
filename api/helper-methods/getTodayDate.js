function getTodayDate() {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  let d = new Date();
  const todayDate = `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
  return todayDate;
}
module.exports = getTodayDate;
