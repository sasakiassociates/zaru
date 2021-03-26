const listView = () => {
    const $list = $('<div id="list-view">').appendTo('body');
    return {
        updateList: (records, palette, sliderTime, t) => {
            $list.empty();
            const sorted = records.slice();
            sorted.sort((a, b) => {
                return t(a) - t(b);
            });
            sorted.forEach((record, i) => {
                let time = t(record);
                let timeTxt = time;
                if (time > 240) {
                    timeTxt = '😧';
                }
                const $r = $('<div class="list-record">').appendTo($list);
                $('<div class="list-record-color">').css({backgroundColor: palette[record.Category]}).appendTo($r);
                $('<div class="list-record-time">').text(timeTxt).appendTo($r);
                $('<div class="list-record-name">').text(record.Name).appendTo($r);
                $r.toggleClass('unreached', time > sliderTime);

            });//r._times.entrance
        }
    }
};

