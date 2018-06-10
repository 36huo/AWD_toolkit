/**
 * ChangeLog：
 * ====================================
 *
 * 1.0.0:
 *
 * 搭起了基础的架子，完成了主体功能。
 *
 * ------------------------------------
 *
 * 1.1.0:
 *
 * 已实现：
 * [X]纯采用table实现
 * [X]支持三种展示方式：
 *        1、直接将数据作为参数置入 data 中，此种情况不会分页，数据格式是list；
 *        2、参数中定义了url，但是 pagination 设置为 false，则后台读取数据但不分页，数据格式同上；
 *        3、定义了url，且 pagination 为 true（默认值），后台读取数据，且前台出现分页栏。
 * [X]支持复选框（不要那种点击选整行的，看着含义不够明显）
 * [X]支持首列显示行号
 * [X]所有样式可通过css定制，例如定制那个载入页面时候的菊花的css
 * [X]定义了多个事件，基本满足需求了
 * [X]支持添加附加参数，以便传递到后台
 * [X]提供了几个方法方便前台调用，例如reload（重建表格）、getSelectedItems（查看那些复选框被选中）
 * [X]支持初次进入页面的时候表格初始为隐藏状态，之后通过调用reload方法创建表格。这个在跟某些组件联动
 *    的时候比较有用，例如点击树上某个分支的时候才载入表格内容
 * [X]提供三个demo网页，怎么用基本上一目了然了
 *
 * 尚未实现
 * [ ]支持点击标题行后台排序（这个在犹豫是否有必要）
 * [ ]序列号表单数据到请求中（这个是下一步要加的功能，等待项目实际用到的时候再加吧）
 *
 * ------------------------------------
 *
 * 1.1.1
 *
 * 修改了个hidden属性为true时候没有设置url会报错的bug
 *
 * ------------------------------------
 *
 * 1.1.2
 *
 * 修正了 thead下面 tr没有包住td的bug
 * 增加了操作列，用于显示修改、删除两个连接，并且提供了俩相关的事件
 *
 * ------------------------------------
 *
 * 1.1.3
 *
 * 增加自定义操作按钮属性 optButtons
 * 缺省的修改、删除按钮属性放置到 optDefaultBtn
 *
 */
//jsHint options
/*jslint devel: true, windows: true, passfail: false, evil: false, plusplus: true, white: true,
	jQuery: true */

(function ($) {

	'use strict';

	var version = '1.1.3',

		settings,	// 设置项

		// 数据载入模式，支持以下数值：
		// 1：直接定义在data里面的静态数据
		// 2：通过url读取的数据，不过不分页， pagination = false
		// 3：通过url读取数据，分页， pagination = true
		dataMode = 3,

		rowsData = {},	// 用于存储表格数据列表
		paramDataName = 'params',	// 绑定的data名字

		paramPageName = 'page',
		paramSizeName = 'size',

		colNum = 0;	// 表格列数

	/**
	 * 类似于java 中的 String.format()。
	 * 用法是： str('abc{0}efg{1}hgi{2}...', '1', '2', '3');
	 * 需要注意的是中括号中需要从0开始
	 *
	 * @return {String} 替换后的字符串
	 */
	var str = function() {
		var args = arguments,
			s = args[0];

		return s.replace(/{(\d+)}/g, function(match, number) {
			var n = parseInt(number) + 1;

			return typeof args[n] !== 'undefined'
				? args[n]
				: match;
		});
	};

	var htmlEncode = function (value) {
		return !value ? value : String(value).replace(/&/g, "&amp;")
			.replace(/\"/g, "&quot;").replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	};

	/**
	 * 添加值到table的data上
	 * 用于提交到后台。需要注意的是 size 和 page 是已经占用的参数
	 * @param {Object} $table 表格的jQuery对象
	 * @param {String} name   参数名
	 * @param {Object} value  参数值
	 */
	var addParam2Data = function($table, name, value) {
		var data = $table.data(paramDataName);

		if ($.isPlainObject(name)) {
			$.extend(data, name);
		} else {
			data[name] = value;
		}
		$table.data(paramDataName, data);
	};


	// 初始化
	var init = function(options) {
		var $this = this;

		settings = $.extend(true, {
			// 取后台数据的url，需注意，这个字段的优先级低于data字段
			// 也就是说如果后者有值的话则忽略url
			url: "",

			// 静态数据，可用来生成非分页的表，需注意：此字段与url互斥
			// 如果使用了此字段的话，那么下面的几个key定义也就不必要了
			data: [],

			// 部分情况下可能在初始化的时候并不想显示表格，
			// 那么这时候可以将此属性设置为 true，在此情况下
			// 即使定义了 url，也不会载入数据。
			// 可以在之后通过 reload 方法重新显示表格
			hidden: false,

			tableCls: 'basicGrid',	// table上的class
			width: '100%',	// 表格宽
			emptyTbodyText: 'The table is Empty',

			autoEncode: true,	// 是否对内容做encode处理

			rowNumCol: true,	// 是否显示行数
			rowNumColText: '#',	// 行数列标题

			altRows: true,	// 是否隔行显示不同颜色
			altRowCls: 'alt-row-color', // 隔行定义的css

			checkboxCol: true,	// 是否显示多选列

			// 表格内容model
			// {} 对象格式，内容有：
			//   index: String
			//   text: String
			//   headCls: String
			//   headStyle: String
			//   hidden: boolean
			//   formatter: function格式，参数为： (tableData, rowData, index, cellData)
			colModel: [],

			// 是否将最后一行默认为操作行
			// 该行将显示“修改、删除”两个连接
			optCol: false,
			optColHeadText: '操作',

			optDefaultBtn: {
                // 如果不想显示某个缺省按钮，直接将其置为 null 即可
				modifyBtn: {
					cls: 'item-opt-modify',
					text: '<i class="icon-edit"></i> 修改',
					event: 'optModifyClick',
					action: null
				},
				deleteBtn: {
					cls: 'item-opt-delete',
					text: '<i class="icon-remove"></i> 删除</a>',
					event: 'optDeleteClick',
					action: null
				},
				cc: null
			},

			optButtons: [],

			formEl: '',	// TODO: 跟表单绑定

			// json数据的key定义
			keys: {
				// id字段名，默认为id
				id: 'id',

				// 分页信息，只需要返回当前页和总记录数即可
				page: 'page',
				total: 'total',

				// 记录集对象名称
				rows: 'rows'
			},

			pagination: true,		// 是否分页

			// 当指定分页栏的 selector 的话，则使用之
			// 否则当 pagination 为 true 的时候会自动添加个分页栏
			pageEl: null,

			currentPage: 1,			// 当前所在页数，从1开始
			pageSize: 20,			// 每页记录数

			// 提供多个参数可用：
			//   {from}: 开始的记录位置
			//   {to}: 结束的记录位置
			//   {total}: 记录总数
			//   {curPage}: 当前所在页面
			//   {pages}: 总页数
			//   {size}: 每页记录数，注意：不是实际载入的记录数，最后一页数量可能会小于这个数值
			//pageInfo: 'Display {from} to {to} of {total} items',
			pageInfo: '页数: {curPage}/{pages} (记录: {from} - {to})',

			txtFirst: '&hellip;',
			titleFirst: '首页',
			txtPrevious: '«',
			titlePrevious: '上一页',
			txtNext: '»',
			titleNext: '下一页',
			txtLast: '&hellip;',
			titleLast: '尾页',


			onError: null,		// url载入失败后的处理方法

			extraParams: {}		// 扩展对象，用于提交时候一起扔到后台

		}, options);

		return this.each(function() {
			var $table = $(this),
				o = settings;

			// 首先判断id的格式是否正确
			if (!/^\#[\w\-_]+$/i.test($this.selector)) {
				$.error('Table id [' + $this.selector + '] has wrong format!');
			}

			// 判断属性定义是否正确
			if (!settingsValid(o)) return;

			// 取得给定table的id，这个暂时没想到有啥必要，先屏蔽吧
			// $table.tableId = $this.selector.slice(1);

			// 判断数据载入模式
			// settings中的data参数优先级将会高于url
			if (o.data && o.data.length > 0) {
				dataMode = 1;
				rowsData = o.data;
			} else if (o.url || o.hidden) {
				dataMode = o.pagination ? 3 : 2;
			} else {
				$.error('参数中data和url必须设置一个');
			}

			initTable($table);

			// 是否隐藏表格
			if (o.hidden) {
				$table.hide();
				return;
			}

			buildTable($table);

		});
	};

	/**
	 * 验证给定属性是否正确
	 *
	 * @param  {Object} o 属性对象
	 * @return {boolean}   验证结果
	 */
	var settingsValid = function(o) {

		var result = true;

		if (!o.colModel || o.colModel.length === 0) {
			$.error('colModel not define');
			result = result && false;
		}
		return result;
	};

	/**
	 * 初始化table
	 * 只是设置一些属性，并不实际生成表格内容，也不会从后台读取数据
	 */
	var initTable = function($table) {
		var colNum = 0, model, cls;

		// 设置表格样式
		if (!$table.hasClass(settings.tableCls)) {
			$table.addClass(settings.tableCls);
		}
		if (settings.width) {
			$table.attr('width', settings.width);
		}

		resetData($table);
	};

	/**
	 * 设置初始参数并将其缓存到表格对象上
	 * @param  {Object} $table jQuery格式的对象
	 * @return {void}
	 */
	var resetData = function($table) {
		// 绑定个空对象到table上并做一些初始化操作
		var data = {};

		if (dataMode === 3) {
			data[paramSizeName] = settings.pageSize;
			data[paramPageName] = settings.currentPage;
		}

		$.extend(data, settings.extraParams);
		$table.data(paramDataName, data);
	}

	/**
	 * 表格生成的主体函数
	 * @param  {[type]} $table [description]
	 * @return {[type]}        [description]
	 */
	var buildTable = function ($table) {
		// 表格生成之前触发的事件
		$table.trigger('loadBegin');

		if (dataMode === 1) {	// 根据静态的 setting.data 参数来生成表格，无分页
			buildTableContent($table);
		} else {
			// 从后台载入数据
			loadDataFromUrl($table, onSuccess, settings.onError);

		}
	};

	/**
	 * 通过ajax方式从后台读取json数据
	 *
	 * @return {[type]} [description]
	 */
	var loadDataFromUrl = function ($table, onsuccess, onerror) {
		var params = $table.data(paramDataName);

		$.ajax({
			url: settings.url,
			dataType: 'json',
			//cache: false,
			context: $table,
			data: params,
			success: function (data, status) {
				onsuccess($table, data, status);
			},
			error: function(req, status, err) {
				if ($.isFunction(onerror)) {
					onerror($table, req, status, err);
				}
				$table.trigger('loadError', [req, status, err]);
			}
		});
	};

	/**
	 * url载入成功之后的处理方法
	 *
	 */
	var onSuccess = function ($table, data, status) {
		var pageParam = {},
			o = settings;

		// 数据格式不同，需要分别处理
		if (dataMode === 3) {	// 处理分页参数
			// 从rows对象得到数据
			rowsData = data[o.keys.rows];

			pageParam['total'] = data[o.keys.total];
			pageParam['page'] = data[o.keys.page];
			pageParam['size'] = o.pageSize;
		} else {
			// 从后台读取的不分页表格数据格式是列表，没有分页信息
			rowsData = data;
		}

		buildTableContent($table, o.pagination, pageParam);

	};

	/**
	 * 填充表格内容，生成分页组件，并进行事件绑定等操作
	 *
	 * @param  {Object} $table     jQuery格式的表格对象
	 * @param  {boolean} appendPage 是否添加分页栏
	 * @param  {Object} pageParam  一些分页相关的参数
	 * @return {void}
	 */
	var buildTableContent = function ($table, appendPage, pageParam) {
		// 首先清楚表格内容
		$table.empty();

		// 生成表格标题行
		appendTableHead($table);

		// 生成内容
		appendTableBody($table);

		// 是否添加分页栏
		if (appendPage && pageParam) {
			appendPagebar($table, pageParam);
		}

		// 表格生成完毕之后触发的事件
		$table.trigger('loadComplete', [rowsData]);
	};

	/**
	 * 生成表格标题行
	 *
	 * @param  {Object} $table
	 * @return {void}
	 */
	var appendTableHead = function($table) {
		var model, cls, i,
			o = settings,
			temp, $temp,
			$thead = $('<thead></thead>'),
			$theadTr = $('<tr></tr>');

		// 遍历列并顺便创建标题行
		// 如果需要显示计数列，则需要加1
		if (o.rowNumCol) {
			colNum += 1;

			temp = '<th class="rownum"';
			temp += '>' + o.rowNumColText + '</th>';
			$theadTr.append(temp);
		}

		// 是否显示checkbox列
		if (o.checkboxCol) {
			colNum += 1;

			temp = '<th class="th-cb-all">';
			temp += '<input type="checkbox" class="cb-all">';
			temp += '</th>';
			$theadTr.append(temp);
		}

		for (i = 0; i < o.colModel.length; i++) {
			model = o.colModel[i];
			if (model.hidden) {
				continue;
			}

			cls = 'th-' + model.index;

			colNum += 1;

			temp = '<th';
			// 设置标题列的样式
			if (model.headCls) {
				cls += ' ' + model.headCls;
			};
			temp += ' class="' + cls + '"';

			if (model.headStyle) {
				temp += ' style="' + model.headStyle + '"';
			};

			if (model.width) {
				temp += ' width="' + model.width + '"';
			}

			temp += '>' + model.text + '</th>';

			// 给tr绑定个事件
			$temp = $(temp);
			// 如果要在click里面得到model对象，需要先将其存储起来，否则得到的是循环的最后一个对象
			$temp.data('model', model);
			$temp.click(function(e) {
				$table.trigger('headClick', [$(this).data('model'), this]);
			});

			$theadTr.append($temp);
		};

		// 是否显示操作列
		if (o.optCol) {
			temp = '<th class="opt-head">' + o.optColHeadText + '</th>';
			$theadTr.append(temp);
		}

		$thead.append($theadTr);

		$table.append($thead);
	};

	var appendTableBody =function($table) {
		var model,
			temp,
			$temp,
			$tbody,
			rowData,
			rowId,
			$row,
			cellData,
			i,
			j,

			defaultBtns,
			btn,
			btnIndex,
			buttons,

			tempData,

			delOpt, $delOpt,
			modOpt, $modOpt,
			$optItem,

			o = settings;

		$tbody = $('<tbody></tbody>');

		if ($.isEmptyObject(rowsData)) {
			temp = '<tr><td colspan="' + colNum + '" class="empty-tbody">' + o.emptyTbodyText
				+ '</td></tr>';
			$tbody.append(temp);
		} else {

			// 初始化操作按钮对象
			buttons = o.optButtons || [];
			defaultBtns = [];

			for (btnIndex in o.optDefaultBtn) {
				btn = o.optDefaultBtn[btnIndex];
				if (btn && btn.text) {
					defaultBtns.push(btn);
				}
			}
			buttons = defaultBtns.concat(buttons);


			for (i = 0; i < rowsData.length; i++) {
				rowData = rowsData[i];
				rowId = rowData[o.keys.id];

				$row = $('<tr></tr>');
				if (o.altRows && (i + 1) % 2 === 0) {
					$row.addClass(o.altRowCls);
				}

				temp = '';

				// 首先创建计数列
				if (o.rowNumCol) {
					temp += '<td class="rownum"';
					temp += '>' + (i + 1) + '</td>';
				};

				// 是否显示checkbox列
				if (o.checkboxCol) {
					temp += '<td class="td-cb-row">';
					temp += '<input type="checkbox" class="cb-row"';
					temp += ' name="rowId" value="' + rowId + '">';
					temp += '</td>';
				};
				$row.append(temp);

				// 创建实际的数据列
				for (j = 0; j < o.colModel.length; j++) {
					model = o.colModel[j];
					//console.log(model);
					if (model.hidden) {
						continue;
					};

					// 生成cell
					cellData = rowData[model.index];

					// 如果对象需要自己处理数据，则直接调用其处理函数。
					// 否则会自动处理：如果是空值，则返回 '';
					// 如果autoEncode设置为true，则需要escape html标签
					if ($.isFunction(model.formatter)) {
						cellData = model.formatter.call(model, rowsData, rowData, i, cellData);
					} else {
						if (cellData) {
							cellData = o.autoEncode ? htmlEncode(cellData) : cellData;
						} else {
							cellData = '';
						}
					}
					temp = '<td>' +cellData + '</td>';

					// 给单元格绑定事件，从单元格可以很方便找到行，但是反之则很难了
					// 所以给行上绑定事件没啥意义
					$temp = $(temp);
					tempData = {
						'model': model,
						'rowsData': rowsData,
						'rowData': rowData,
						'cellData': rowData[model.index]
					};
					$temp.data('tempData', tempData);
					$temp.click(function (e) {
						tempData = $(this).data('tempData');

						$table.trigger('cellClick',	[
								tempData.model,
								tempData.rowsData,
								tempData.rowData,
								tempData.cellData,
								this
							]);
					});

					$row.append($temp);
				}

				// 是否显示操作列
				if (o.optCol) {
					$optItem = $('<span class="item-opt"></span>');

					// 缓存行数据到行上
        			tempData = {
						'rowsData': rowsData,
						'rowData': rowData,
						'rowId': rowId
					};
					$row.data('rowData', tempData);

					// 循环生成操作按钮
					for (btnIndex in buttons) {
						btn = buttons[btnIndex];

						$optItem.append(initBtnItem($table, $row, btn));
					};


        			$row.append($('<td></td>').append($optItem));
				}

				$tbody.append($row);
			};

		}

		$table.append($tbody);

		bindEvent2Table($table);
	};

	/**
	 * 生成操作按钮，并绑定事件或方法
	 * @param  {Object} $table
	 * @param  {Object} $row
	 * @param  {Object} btn
	 * @return {Object}       操作按钮的jquery对象
	 */
	var initBtnItem = function($table, $row, btn) {
		var a, href, cls, $btnItem, rowCache, rowDataArr;

		rowCache = $row.data('rowData');

		a = ['<a href="',
				btn.href ? btn.href : '#',
			'" itemId="',
				rowCache.rowId,
			'" class="opt-item ',
				btn.cls ? btn.cls : '',
			'">',
			btn.text,
			'</a>'].join('');
		$btnItem = $(a);

		rowDataArr = [
					rowCache.rowsData,
					rowCache.rowData,
					rowCache.rowId,
					$btnItem
				];

		// 如果存在事件定义则触发此事件
		// 如果直接定义了action，则调用该函数
		// 优先级是event高于action，也就是说二者定义一个就可以了
		if (btn.event || btn.action) {
			$btnItem.click(function(e) {
				e.preventDefault();

				if (btn.event) {
					$table.trigger(btn.event, rowDataArr);
				} else {
					btn.action.apply(this, rowDataArr);
				}

			});
		}
		return $btnItem;
	};

	// 给table上的各个元素绑定事件
	var bindEvent2Table = function($table) {

		// 单独点选某个checkbox的时候触发的方法
		// 给父元素 td、tr 增加后删除个 class
		// 需要先unbind click事件，否则会触发两次
		$('.cb-row', $table).unbind('click').click(function() {
			$(this).parent('td').toggleClass('td-cb-row-active');
			$(this).parent('td').parent('tr').toggleClass('tr-cb-row-active');
		});

		// 点击全选checkbox的时候触发的事件
		$('.cb-all', $table).unbind('click').click(function() {
			var cbAllChecked = $(this).attr('checked');
			$('.cb-row[checked != ' + cbAllChecked + ']', $table).click();
		});

		// 鼠标放到行上后整行变色
		$('tbody tr', $table).mouseover(function () {
			$(this).addClass('row-hover');
		}).mouseout(function () {
			$(this).removeClass('row-hover');
		});
	};

	/**
	 * Pagination 对象，用于分页处理时候使用.
	 */
	/**
	 * 分页对象
	 * @param {int} total    记录集总数
	 * @param {int} curPage  当前页
	 * @param {int} size     每页记录数
	 * @param {int} navPages 同时最多显示导航页码数
	 */
	var Pagination = function(total, curPage, size, navPages) {
		// 总记录数
		this.total = total;

		// 当前页数
		this.curPage = curPage;

		// 每页数据数
		this.size = size ? size : 20;

		// 总页数
		this.pages = Math.floor((this.total - 1) / this.size + 1);

		// 对于给定的当前页，还需要进行下判断，防止给的值是非法的
		// 之后在系统中调用的当前页的属性使用的是 pageNumber
		if (this.curPage < 1) {
			this.pageNumber = 1;
		} else if (this.curPage > this.pages) {
			this.pageNumber = this.pages;
		} else {
			this.pageNumber = this.curPage;
		}

		// 一些页码边界属性的判断
		this.isFirstPage = this.pageNumber === 1;
		this.isLastPage = this.pageNumber === this.pages;
		this.hasPreviousPage = this.pageNumber > 1;
		this.hasNextPage = this.pageNumber < this.pages;

		// 导航页码数，默认是8个
		this.navPages = navPages ? navPages : 8;

		// 记录当前显示的页码，数组形式
		this.navPageNumbers = [];

		this.calNavPageNumbers();
	}

	/**
	 * 计算导航页数组内容
	 * @return {数组} 导航页数字列表
	 */
	Pagination.prototype.calNavPageNumbers = function() {
		var i, startNum, endNum, leftNum, rightNum;

		// 当总页数小于或等于导航页码数
		if (this.pages <= this.navPages) {
			for (i = 0; i < this.pages; i++)
			this.navPageNumbers[i] = i + 1;
		} else {	// 当总页数大于导航页数时
			leftNum = Math.floor(this.navPages / 2);
			rightNum = this.navPages - leftNum;

			startNum = this.pageNumber - leftNum;
			endNum = this.pageNumber + rightNum;

			if (startNum < 1) {	// 从开始算起的导航页
				startNum = 1;

				for (i = 0; i < this.navPages; i++) {
					this.navPageNumbers[i] = startNum++;
				}
			} else if (endNum > this.pages) {	// 尾部记录的导航页
				endNum = this.pages;
				for (i = this.navPages - 1; i >= 0; i--) {
					this.navPageNumbers[i] = endNum--;
				}
			} else {	// 中间记录的导航页
				for (i = 0; i < this.navPages; i++) {
					this.navPageNumbers[i] = startNum++;
				}
			}
		}
	}

	Pagination.prototype.output = function (o, currentPage) {
		var result = '', i, num;

		if (!this.isFirstPage) {
			result += '<li><a href="#" page="1" title="' + o.titleFirst + '">' + o.txtFirst + '</a></li>';
		}
		if (this.hasPreviousPage) {
			result += '<li><a href="#" page="' + (this.curPage - 1) + '" title="' + o.titlePrevious + '">' + o.txtPrevious + '</a></li>';
		}

		for (i = 0; i < this.navPageNumbers.length; i++) {
			num = this.navPageNumbers[i];
			if (num === currentPage) {
				result += '<li class="active"><a href="#">' + num + '</a></li>';
			} else {
				result += '<li><a href="#" page="' + num + '">' + num + '</a></li>';
			}
		}

		if (this.hasNextPage) {
			result += '<li><a href="#" page="' + (this.curPage + 1) + '" title="' + o.titleNext + '">' + o.txtNext + '</a></li>';
		}
		if (!this.isLastPage) {
			result += '<li><a href="#" page="' + this.pages + '" title="' + o.titleLast + '">' + o.txtLast + '</a></li>';
		}

		return result;
	}

	/**
	 * 生成分页栏
	 *
	 * @param  {Object} $table
	 * @param  {Object} pageParams 从load的对象中取到的分页信息
	 * @return {void}
	 */
	var appendPagebar = function($table, pageParams) {
		var $pDiv, info, numbers, pagination, from, to, stat,
			o = settings;

		// 判断是否是自动添加分页栏还是在页面上的某个元素下面生成分页栏
		if (!o.pageEl) {
			// 先做个清除操作
			$('.basicGridPagebar').remove();

			$pDiv = $('<div class="basicGridPagebar"></div>');
		} else {
			$pDiv = $(o.pageEl);
			$pDiv.empty();
		}

		// 如果没有数据，则不显示分页栏
		if (!(rowsData && rowsData.length > 0)) {
			$pDiv.hide();
			return;
		} else {
			$pDiv.show().addClass('clearfix');
		}

		// total, page, size
		pagination = new Pagination(pageParams['total'], pageParams['page'], pageParams['size']);

		from = (pagination.curPage - 1) * pagination.size + 1;
		to = from + pagination.size -1;
		if (to > pagination.total) {
			to = pagination.total;
		}

		info = '<div class="pageinfo">';
		stat = o.pageInfo;
		stat = stat.replace(/{from}/, from);
		stat = stat.replace(/{to}/, to);
		stat = stat.replace(/{total}/, pagination.total);
		stat = stat.replace(/{curPage}/, pagination.pageNumber);
		stat = stat.replace(/{pages}/, pagination.pages);
		stat = stat.replace(/{size}/, settings.pageSize);
		info += stat + '</div>';

		numbers = '<div class="pagination"><ul>';

		numbers += pagination.output(o, pagination.curPage);

		numbers += '</ul></div>';

		$pDiv.append(info).append(numbers);
		$table.after($pDiv);

		bindEvent2Pagebar($table, $pDiv);
	};

	/**
	 * 绑定事件到分页对象上
	 * @param  {Object} $table
	 * @param  {Object} $pagebar jQuery格式的对象，指向分页栏
	 * @return {void}
	 */
	var bindEvent2Pagebar = function($table, $pagebar) {
		$('.pagination a', $pagebar).click(function(e) {
			var $this = $(this);

			e.preventDefault();
//			e.stopPropagation();

			var page = $this.attr('page');

			// 点击分页数字时候触发的事件，可以基于此做一些显示 loading... 之类的操作
			// 例如在某个位置显示个菊花，这个可以自己在css中定制
			$table.trigger('pageNumberClick', [page]);

			$('.pagination', $pagebar).prepend('<span class="page-loading"></span>');

			addParam2Data($table, paramPageName, parseInt(page));

			buildTable($table);
		});
	}

	/**
	 * 增加一些扩展属性，如果在前端显示调用这个方法的话，需要随后调用 reload 方法
	 */
	var addExtraParams = function(params) {
		if ($.isEmptyObject(params)) return;

		return this.each(function () {
			var $table = $(this);
			addParam2Data($table, params);

		});
	};

	/**
	 * 重新生成表格
	 * @param  {String} url 新的url
	 * @return {void}
	 */
	var reload = function(url) {

		return this.each(function() {
			var $table = $(this);

			if (settings.hidden) {
				settings.hidden = false;

			}
			$table.show();

			// 如果修改了url，则需要重置一些初始参数
			if (url && url !== settings.url) {
				settings.url = url;
				resetData($table, settings);
			}
			buildTable($table);
		});

	};

	/**
	 * 返回选中的记录的id，格式为数组
	 *
	 * @return {Array} 选中的条目的id
	 */
	var getSelectedItems = function() {
		var result = [];

		this.each(function () {
			var list = $('.cb-row:checked', $(this));
			$.each(list, function(i, item) {
				result[i] = $(item).val();
			});
		});

		return result;
	};

	var methods = {
		init: init,
		reload: reload,
		addExtraParams: addExtraParams,
		settings: function() {
			return settings;
		},

		getSelectedItems: getSelectedItems,

		// 返回版本号
		version: function() {
			return version;
		}
	};

	/**
	 * 主方法，无参数的话，默认调用 init 方法。
	 * 其它方法调用方式： $grid.basicGrid('reload')
	 *
	 * @param  {String} method 方法名，后面的参数为此方法需要的参数
	 * @return {void}
	 */
	$.fn.basicGrid = function (method) {

		if ( methods[method] ) {
			return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || !method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.basicGrid' );
		}

	};

}(jQuery));
