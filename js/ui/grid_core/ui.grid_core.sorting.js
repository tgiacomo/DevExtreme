import $ from "../../core/renderer";
import eventsEngine from "../../events/core/events_engine";
import clickEvent from "../../events/click";
import typeUtils from "../../core/utils/type";
const isDefined = typeUtils.isDefined;
import extendUtils from "../../core/utils/extend";
const extend = extendUtils.extend;
import sortingMixin from "../grid_core/ui.grid_core.sorting_mixin";
import messageLocalization from "../../localization/message";
import eventUtils from "../../events/utils";

const COLUMN_HEADERS_VIEW_NAMESPACE = "dxDataGridColumnHeadersView";

const ColumnHeadersViewSortingExtender = extend({}, sortingMixin, {
    _createRow(row) {
        const that = this;
        const $row = that.callBase(row);

        if(row.rowType === "header") {
            eventsEngine.on($row, eventUtils.addNamespace(clickEvent.name, COLUMN_HEADERS_VIEW_NAMESPACE), "td", that.createAction(e => {
                if($(e.event.currentTarget).parent().get(0) !== $row.get(0)) {
                    return;
                }
                let keyName = null;
                const event = e.event;
                const $cellElementFromEvent = $(event.currentTarget);
                const rowIndex = $cellElementFromEvent.parent().index();
                let columnIndex = -1;
                [].slice.call(that.getCellElements(rowIndex)).some(($cellElement, index) => {
                    if($cellElement === $cellElementFromEvent.get(0)) {
                        columnIndex = index;
                        return true;
                    }
                });
                const visibleColumns = that._columnsController.getVisibleColumns(rowIndex);
                const column = visibleColumns[columnIndex];
                const editingController = that.getController("editing");
                const editingMode = that.option("editing.mode");
                const isCellEditing = editingController && editingController.isEditing() && (editingMode === "batch" || editingMode === "cell");

                if(isCellEditing || !that._isSortableElement($(event.target))) {
                    return;
                }

                if(column && !isDefined(column.groupIndex) && !column.command) {
                    if(event.shiftKey) {
                        keyName = "shift";
                    } else if(event.ctrlKey) {
                        keyName = "ctrl";
                    }
                    setTimeout(() => {
                        that._columnsController.changeSortOrder(column.index, keyName);
                    });
                }
            }));
        }

        return $row;
    },

    _renderCellContent($cell, options) {
        const that = this;
        const column = options.column;

        if(!column.command && options.rowType === "header") {
            that._applyColumnState({
                name: "sort",
                rootElement: $cell,
                column,
                showColumnLines: that.option("showColumnLines")
            });
        }

        that.callBase($cell, options);
    },

    _columnOptionChanged(e) {
        const changeTypes = e.changeTypes;

        if(changeTypes.length === 1 && changeTypes.sorting) {
            this._updateIndicators("sort");
            return;
        }

        this.callBase(e);
    },

    optionChanged(args) {
        const that = this;

        switch(args.name) {
            case "sorting":
                that._invalidate();
                args.handled = true;
                break;
            default:
                that.callBase(args);
        }
    }
});

const HeaderPanelSortingExtender = extend({}, sortingMixin, {
    _createGroupPanelItem($rootElement, groupColumn) {
        const that = this;
        const $item = that.callBase(...arguments);

        eventsEngine.on($item, eventUtils.addNamespace(clickEvent.name, "dxDataGridHeaderPanel"), that.createAction(() => {
            setTimeout(() => {
                that.getController("columns").changeSortOrder(groupColumn.index);
            });
        }));

        that._applyColumnState({
            name: "sort",
            rootElement: $item,
            column: {
                alignment: that.option("rtlEnabled") ? "right" : "left",
                allowSorting: groupColumn.allowSorting,
                sortOrder: groupColumn.sortOrder === "desc" ? "desc" : "asc"
            },
            showColumnLines: true
        });

        return $item;
    },

    optionChanged(args) {
        const that = this;

        switch(args.name) {
            case "sorting":
                that._invalidate();
                args.handled = true;
                break;
            default:
                that.callBase(args);
        }
    }
});

module.exports = {
    defaultOptions() {
        return {
            /**
             * @name GridBaseOptions.sorting
             * @type object
             */
            sorting: {
                /**
                 * @name GridBaseOptions.sorting.mode
                 * @type Enums.GridSortingMode
                 * @default "single"
                 */
                mode: "single",
                /**
                 * @name GridBaseOptions.sorting.ascendingText
                 * @type string
                 * @default "Sort Ascending"
                 */
                ascendingText: messageLocalization.format("dxDataGrid-sortingAscendingText"),
                /**
                 * @name GridBaseOptions.sorting.descendingText
                 * @type string
                 * @default "Sort Descending"
                 */
                descendingText: messageLocalization.format("dxDataGrid-sortingDescendingText"),
                /**
                 * @name GridBaseOptions.sorting.clearText
                 * @type string
                 * @default "Clear Sorting"
                 */
                clearText: messageLocalization.format("dxDataGrid-sortingClearText")
            }
        };
    },
    extenders: {
        views: {
            columnHeadersView: ColumnHeadersViewSortingExtender,
            headerPanel: HeaderPanelSortingExtender
        }
    }
};
