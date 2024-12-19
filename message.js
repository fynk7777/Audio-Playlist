const message = "2024/12/20 00:00まで、テストをしている可能性があります。ご注意ください";
const targetDate = new Date(2024, 11, 19, 0, 0); // 12月は11として指定
const now = new Date();

if (message !== "" && now < targetDate) {
  alert(message);
}
