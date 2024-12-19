const time = Date()
const message = "2024/12/20 00:00まで、テストをしている可能性があります。ご注意ください"
const y = 2024
const m = 12
const d = 20
const h = 0
const min = 0

const now_y = time.getFullYear()
const now_m = time.getMonth()
const now_d = time.getDate()
const now_h = time.getHours()
const now_min = time.getMinutes
if (message !== "") {
  if (now_y < y){//now_yがyより少なかったら
    al()
  } else if(now_y <= y){//now_yがy以下だったら
    if (now_m < m){//now_mがmより少なかったら
      al()
    } else if (now_m <= m){//now_mがm以下だったら
      if (now_d < d){//now_dがdより少なかったら
        al()
      } else if(now_d <= d){//now_dがd以下だったら
        if (now_h < h){//now_hがhより少なかったら
          al()
        } else if(now_h <= h){//now_hがh以下だったら
          if (now_min < min){//now_minがminより少なかったら
            al()
          }
            
          } 
        }
      }  
    }
  }
function al(){
  alert(message)
}
