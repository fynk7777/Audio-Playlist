const message = "2024/12/20 00:00までは、テストをしている可能性があります。ご注意ください。";
const targetDate = new Date(2024, 11, 20, 0, 0); //年,月(-1),日,時,分
const now = new Date();

if (message !== "" && now < targetDate) {
  alert(message);
}
