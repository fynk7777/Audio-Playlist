const message = "2024/12/19 00:00より前にアクセスしています。ご注意ください。";
const targetDate = new Date(2024, 11, 20, 0, 0); // 12月は11として指定
const now = new Date();

if (message !== "" && now < targetDate) {
  alert(message);
}
