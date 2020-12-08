//IMP.init 메서드는 아임포트 결제를 위한 기능을 준비한다.

$(function () {
  var IMP = window.IMP;
  IMP.init('imp13826839');
  $('.order-form').on('submit', function (e) {
    var amount = parseFloat($('.order-form input[name="amount"]').val().replace(',', ''));
    var type = $('.order-form input[name="type"]:checked').val();
    // 폼 데이터를 기준으로 주문 생성
    var order_id = AjaxCreateOrder(e);
    if (order_id == false) {
      alert('주문 생성 실패\n다시 시도해주세요.');
      return false;
    }

    // 결제 정보 생성
    var merchant_id = AjaxStoreTransaction(e, order_id, amount, type);

    // 결제 정보가 만들어 졌으면 iamport 로 실제 결제 시도
    if (merchant_id !== '') {
      IMP.request_pay({
        merchant_uid: merchant_id,
        name: 'E-Shop product',
        buyer_name:$('input[name="first_name"]').val()+" "+$('input[name="last_name"]').val(),
        buyer_email:$('input[name="email"]').val(),
        amount: amount
      }, function (rsp) {
        if (rp.success) {
          var msg = '결제가 완료되었습니다.'
          msg += '고유ID : ' + rsp.imp_uid;
          msg += '상점 거래ID : ' + rsp.merchant_uid;
          msg += '결제 금액 : ' + rsp.paid_amount;
          msg += '카드 승인번호 : ' + rsp.apply_num;
          // 결제가 완료되었으면 비교해서 디비에 반영
          ImpTransaction(e, order_id, rsp.merchant_uid, rsp.imp_uid, rsp.paid_amount);
        } else {
          var msg = '결제에 실패하였습니다.';
          msg += '에러내용 : ' + rsp.error_msg;
          console.log(msg);
        }
      });
    }
    return false;
  });
});

// 주문정보를 서버로 전달해 Order 객체를 생성하는 역할을 한다.
// 서버에서 반환받은 order_id 를 다음 단계에 전달한다.

function AjaxCreateOrder (e) {
  e.preventDefault();
  var order_id = '';
  var request = $.ajax({
    method: "POST",
    url: order_create_url,
    async: false,
    data: $('.order-form').serialize()
  });
  request.done(function (data) {
    if (data.order_id) {
      order_id = data.order_id;
    }
  });
  request.fail(function (jqXHR, textStatus) {
    if (jqXHR.status == 404) {
      alert("페이지가 존재하지 않습니다.");
    } else if (jqXHR.status == 403) {
      alert("로그인 해주세요.");
    } else{
      alert("문제가 발생했습니다. 다시 시도해주세요.")
    }
  });
  return order_id;
}

//결제정보를 저장한다.
//OrderTransaction 객체를 생성하는 뷰를 호출하고 아임포트에 전달할 유니크 주문번호를 반환받는다.

function AjaxStoreTransaction(e, order_id, amount, type) {
  e.preventDefault();
  var merchant_id = '';
  var request = $.ajax({
    method: "POST",
    url: order_checkout_url,
    async: false,
    data: {
      order_id : order_id,
      amount: amount,
      type: type,
      csrfmiddlewaretoken: csrf_token,
    }
  });
  request.done(function (data) {
    if (data.works) {
      merchant_id = data.merchant_id;
    }
  });
  request.fail(function (jqXHR, textStatus) {
    if (jqXHR.status == 404) {
      alert("페이지가 존재하지 않습니다.");
    } else if (jqXHR.status == 403) {
      alert("로그인 해주세요.");
    } else{
      alert("문제가 발생했습니다. 다시 시도해주세요.")
    }
  });
  return merchant_id;
}

//결제 완료후에 호출되서 결제 검증

function ImpTransaction(e, order_id, merchant_id, imp_id, amount) {
  e.preventDefault();
  var request = $.ajax({
    method: "POST",
    url: order_validation_url,
    async: false,
    data: {
      order_id: order_id,
      merchant_id: merchant_id,
      imp_id: imp_id,
      amount: amount,
      csrfmiddlewaretoken: csrf_token
    }
  });
  request.done(function (data) {
    if (data.works) {
      $(location).attr('href', location.origin+order_complete_url+'?order_id='+order_id)
    }
  });
  request.fail(function (jqXHR, textStatus) {
    if (jqXHR.status == 404) {
      alert("페이지가 존재하지 않습니다.");
    } else if (jqXHR.status == 403) {
      alert("로그인 해주세요.");
    } else{
      alert("문제가 발생했습니다. 다시 시도해주세요.")
    }
  });
}
