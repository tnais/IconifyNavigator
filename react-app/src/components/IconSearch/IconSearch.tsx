import { useState } from 'react';
import { IconSearchOptions } from '../../models/icon.model';

interface Props {
  /** Callback invoked with the current filter options each time the user searches or resets. */
  onSearch: (options: IconSearchOptions) => void;
}

/**
 * IconSearch renders a form with three fields — name, category, and tags — that
 * match the attribute names of Iconify icons, as required by the acceptance criteria.
 * The tags field accepts a comma-separated list which is split into an array on submit.
 */
function IconSearch({ onSearch }: Props) {
  /** Controlled value for the icon name filter field. */
  const [name, setName] = useState('');

  /** Controlled value for the category filter field. */
  const [category, setCategory] = useState('');

  /** Controlled value for the comma-separated tags input. */
  const [tagsInput, setTagsInput] = useState('');

  /** Collects the form values, parses tags, and fires the search callback. */
  function handleSearch(e: React.FormEvent): void {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSearch({
      name: name || undefined,
      category: category || undefined,
      tags: tags.length > 0 ? tags : undefined
    });
  }

  /** Resets all fields to empty and emits an empty search to clear results in the parent. */
  function handleReset(): void {
    setName('');
    setCategory('');
    setTagsInput('');
    onSearch({});
  }

  return (
    <form className="search-form" onSubmit={handleSearch}>
      <div>
        <label htmlFor="name">name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          type="text"
          placeholder="home"
        />
      </div>
      <div>
        <label htmlFor="category">category</label>
        <input
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          type="text"
          placeholder="building"
        />
      </div>
      <div>
        <label htmlFor="tags">tags</label>
        <input
          id="tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          type="text"
          placeholder="house,outline"
        />
      </div>
      <div className="actions">
        <button type="submit">Search</button>
        <button type="button" onClick={handleReset}>
          Reset
        </button>
      </div>
    </form>
  );
}

export default IconSearch;
