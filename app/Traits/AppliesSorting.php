<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait AppliesSorting
{
    /**
     * Apply ?sort_by=&sort_dir= to the query, falling back to the default.
     * Columns can be dotted ("client.full_name") to indicate a joined relation sort
     * which joins the related table on the model's primary key.
     *
     * Allowed columns must be a list of either plain column names or
     * "relation.field" pairs.
     */
    protected function applySort(
        Builder $query,
        Request $request,
        array $allowed,
        string $defaultCol,
        string $defaultDir = 'asc'
    ): void {
        $sortBy = $request->input('sort_by');
        if (! in_array($sortBy, $allowed, true)) {
            $sortBy = $defaultCol;
        }

        $sortDir = strtolower((string) $request->input('sort_dir', $defaultDir));
        if (! in_array($sortDir, ['asc', 'desc'], true)) {
            $sortDir = $defaultDir;
        }

        if (str_contains($sortBy, '.')) {
            [$relation, $field] = explode('.', $sortBy, 2);
            $model = $query->getModel();
            if (! method_exists($model, $relation)) {
                return;
            }
            $relationDef = $model->{$relation}();
            $related = $relationDef->getRelated();
            $relatedTable = $related->getTable();
            $localKey = $relationDef->getQualifiedForeignKeyName();
            $ownerKey = $relationDef->getQualifiedOwnerKeyName();

            $query->leftJoin(
                $relatedTable,
                $localKey,
                '=',
                $ownerKey
            )->orderBy($relatedTable . '.' . $field, $sortDir);
        } else {
            $query->orderBy($sortBy, $sortDir);
        }
    }
}
